import { Nullable, Vector3 } from "@babylonjs/core";
import GameSystem from "./GameSystem";
import { applyActionEffects } from "src/modules/CombatModule";
import {
    ACTOR_GROUND_Y,
    ACTOR_SPRITE_VERTICAL_OFFSET,
} from "src/constants/GeneralConstants";
import {
    getActorStateComponentArray,
    getProjectileComponentArray,
} from "src/modules/ComponentModule";
import { EntityId, query, removeEntity } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import { inject } from "tsyringe";
import ProjectileComponent from "src/components/ProjectileComponent";
import {
    getActorCollisionRadius,
    getActorPosition,
} from "src/modules/Collision3DModule";
import { TargetingShapeFunctionProps } from "src/processors/TargetingShapeProcessor";
import {
    getAbilityTargetsByList,
    deliverAbilityEffectsBySphere,
} from "src/modules/TargetingModule";

export default class ProjectileSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const projectileComponentArray = getProjectileComponentArray();
        for (const entityId of query(this.gameScene.world, [
            projectileComponentArray,
        ])) {
            const projectile = projectileComponentArray[entityId];

            if (projectile.targetEntityId) {
                this.updateTargetedProjectile(
                    deltaTime,
                    entityId,
                    projectile,
                );
            } else if (projectile.targetPosition && projectile.sphereRadius) {
                this.updatePositionalProjectile(deltaTime, projectile);
            }
        }
    }

    private updateTargetedProjectile(
        deltaTime: number,
        entityId: EntityId,
        projectile: ProjectileComponent,
    ): void {
        const targetEntityId = projectile.targetEntityId;
        if (!targetEntityId) {
            return;
        }

        const targetActorState = getActorStateComponentArray()[targetEntityId];
        const targetPosition = getActorPosition(targetEntityId);
        const isTargetAlive =
            !!targetActorState &&
            !targetActorState.isDefeated &&
            !!targetPosition;

        if (isTargetAlive && targetPosition) {
            this.updateLastTargetPosition(projectile, targetPosition);
        }

        const destination = isTargetAlive
            ? targetPosition
            : projectile.lastTargetPosition;
        if (!destination) {
            removeEntity(this.gameScene.world, entityId);
            return;
        }

        const projectileDirection = this.getDirectionToPosition(
            destination,
            projectile.mesh.position,
        );
        if (projectileDirection) {
            this.moveProjectileInDirection(
                deltaTime,
                projectileDirection,
                projectile,
            );
        }

        if (!isTargetAlive) {
            if (
                this.findProjectileHitPosition(projectile, destination) ||
                projectile.distanceTraveled >= projectile.maxRange
            ) {
                removeEntity(this.gameScene.world, entityId);
            }
            return;
        }

        const hitEntityId = this.findProjectileHitActor(projectile);
        if (hitEntityId >= 0) {
            applyActionEffects(
                projectile.actionData,
                projectile.sourceEid,
                targetEntityId,
            );
            removeEntity(this.gameScene.world, entityId);
            return;
        }

        if (projectile.distanceTraveled >= projectile.maxRange) {
            removeEntity(this.gameScene.world, entityId);
        }
    }

    private updatePositionalProjectile(
        deltaTime: number,
        projectile: ProjectileComponent,
    ): void {
        const targetPosition = projectile.targetPosition;
        if (!targetPosition) {
            return;
        }

        const projectileDirection = this.getDirectionToPosition(
            targetPosition,
            projectile.mesh.position,
        );
        if (!projectileDirection) {
            return;
        }

        this.moveProjectileInDirection(
            deltaTime,
            projectileDirection,
            projectile,
        );

        if (this.findProjectileHitPosition(projectile, targetPosition)) {
            const targetingShapeFunctionProps = {
                sourceEntityId: projectile.sourceEid,
                action: projectile.actionData,
                shape: {
                    type: "sphereProjectile",
                    radius: projectile.sphereRadius,
                },
                candidates: getAbilityTargetsByList(
                    projectile.sourceEid,
                    projectile.actionData,
                ),
                targetPosition,
            } as TargetingShapeFunctionProps;
            deliverAbilityEffectsBySphere(targetingShapeFunctionProps);
        }
    }

    private updateLastTargetPosition(
        projectile: ProjectileComponent,
        targetPosition: Vector3,
    ): void {
        if (!projectile.lastTargetPosition) {
            projectile.lastTargetPosition = targetPosition.clone();
            return;
        }

        projectile.lastTargetPosition.copyFrom(targetPosition);
    }

    private getDirectionToPosition(
        toPosition: Vector3,
        fromPosition: Vector3,
    ): Nullable<Vector3> {
        const toTarget = toPosition.subtract(fromPosition);
        toTarget.y = 0;
        if (toTarget.lengthSquared() < 0.0001) {
            return null;
        }
        return toTarget.normalize();
    }

    private moveProjectileInDirection(
        deltaTime: number,
        direction: Vector3,
        projectile: ProjectileComponent,
    ) {
        projectile.direction.copyFrom(direction);
        projectile.mesh.rotation.y = Math.atan2(direction.x, direction.z);

        const distanceStep = projectile.speed * deltaTime;
        projectile.mesh.position.addInPlace(
            projectile.direction.scale(distanceStep),
        );
        projectile.mesh.position.y =
            ACTOR_GROUND_Y + ACTOR_SPRITE_VERTICAL_OFFSET;
        projectile.distanceTraveled += distanceStep;
    }

    private findProjectileHitActor(projectile: ProjectileComponent): EntityId {
        const entityId = projectile.targetEntityId;
        if (!entityId) {
            return -1;
        }

        const targetActorState = getActorStateComponentArray()[entityId];
        if (!targetActorState || targetActorState.isDefeated) {
            return -1;
        }

        const targetPosition = getActorPosition(entityId);
        if (!targetPosition) {
            return -1;
        }

        const offsetFromTarget =
            projectile.mesh.position.subtract(targetPosition);
        const horizontalDistance = Math.sqrt(
            offsetFromTarget.x * offsetFromTarget.x +
                offsetFromTarget.z * offsetFromTarget.z,
        );

        if (
            horizontalDistance <=
            projectile.radius + getActorCollisionRadius(entityId)
        ) {
            return entityId;
        }

        return -1;
    }

    private findProjectileHitPosition(
        projectile: ProjectileComponent,
        targetPosition: Vector3,
    ): boolean {
        const offsetFromTarget =
            projectile.mesh.position.subtract(targetPosition);
        const horizontalDistance = Math.sqrt(
            offsetFromTarget.x * offsetFromTarget.x +
                offsetFromTarget.z * offsetFromTarget.z,
        );

        if (horizontalDistance <= projectile.radius) {
            return true;
        }

        return false;
    }
}
