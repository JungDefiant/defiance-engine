import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { Vector3 } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import CollisionComponent from "src/components/CollisionComponent";
import {
    getActorNavigationComponentArray,
    getActorStateComponentArray,
    getCollisionComponentArray,
} from "src/modules/ComponentModule";
import { getControlState } from "src/modules/GameStateModule";
import {
    getActorPosition,
    triggerCollisionBehaviors,
} from "src/modules/Collision3DModule";
import {
    getNavigationObstacles,
    syncActorWorldSprite,
    teleportNavigationAgent,
} from "src/modules/ActorNavigationModule";
import { clamp, cmToMeters } from "src/modules/Utils";
import { ACTOR_GROUND_Y } from "src/constants/GeneralConstants";
import {
    ACTOR_SPACING_MARGIN,
    DEFAULT_ACTOR_COLLISION_RADIUS,
    SEPARATION_ITERATIONS,
    SEPARATION_MAX_CORRECTION_SPEED,
    SEPARATION_RELAXATION,
    SEPARATION_TELEPORT_THRESHOLD,
} from "src/constants/NavigationConstants";

export default class Collision3DSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        this.resolveActorSpacing(deltaTime);
        this.resolveEnvironmentCollisions();
    }

    private resolveActorSpacing(deltaTime: number) {
        const navigationComponentArray = getActorNavigationComponentArray();
        const collisionComponentArray = getCollisionComponentArray();
        const actorStateComponentArray = getActorStateComponentArray();
        const navigatingEids = query(this.gameScene.world, [
            navigationComponentArray,
        ]);

        for (
            let iteration = 0;
            iteration < SEPARATION_ITERATIONS;
            iteration++
        ) {
            let appliedCorrection = false;

            for (let i = 0; i < navigatingEids.length; i++) {
                for (let j = i + 1; j < navigatingEids.length; j++) {
                    const correctedPair = this.applyPairSpacing(
                        deltaTime,
                        navigatingEids[i],
                        navigatingEids[j],
                        navigationComponentArray,
                        collisionComponentArray,
                        actorStateComponentArray,
                    );
                    if (correctedPair) {
                        appliedCorrection = true;
                    }
                }
            }

            if (!appliedCorrection) {
                break;
            }
        }
    }

    private applyPairSpacing(
        deltaTime: number,
        firstEid: EntityId,
        secondEid: EntityId,
        navigationComponentArray: Array<ActorNavigationComponent | undefined>,
        collisionComponentArray: Array<CollisionComponent | undefined>,
        actorStateComponentArray: Array<ActorStateComponent | undefined>,
    ): boolean {
        const firstNavigation = navigationComponentArray[firstEid] ?? null;
        const secondNavigation = navigationComponentArray[secondEid] ?? null;
        if (!firstNavigation || !secondNavigation) {
            return false;
        }

        if (
            firstNavigation.agentIndex >= 0 ||
            secondNavigation.agentIndex >= 0
        ) {
            return false;
        }

        const firstActorState = actorStateComponentArray[firstEid];
        const secondActorState = actorStateComponentArray[secondEid];
        if (
            (firstActorState && firstActorState.isDefeated) ||
            (secondActorState && secondActorState.isDefeated)
        ) {
            return false;
        }

        const firstCollision: CollisionComponent | undefined =
            collisionComponentArray[firstEid];
        const secondCollision: CollisionComponent | undefined =
            collisionComponentArray[secondEid];
        const firstRadius = firstCollision
            ? cmToMeters(firstCollision.radius)
            : cmToMeters(DEFAULT_ACTOR_COLLISION_RADIUS);
        const secondRadius = secondCollision
            ? cmToMeters(secondCollision.radius)
            : cmToMeters(DEFAULT_ACTOR_COLLISION_RADIUS);
        const minimumDistance =
            firstRadius + secondRadius + ACTOR_SPACING_MARGIN;

        const separationVector = firstNavigation.position.subtract(
            secondNavigation.position,
        );
        separationVector.y = 0;
        let separationDistance = separationVector.length();
        if (separationDistance >= minimumDistance) {
            return false;
        }

        let separationDirection: Vector3;
        if (separationDistance < 0.0001) {
            separationDirection = new Vector3(1, 0, 0);
            separationDistance = 0;
        } else {
            separationDirection = separationVector.scale(
                1 / separationDistance,
            );
        }

        const overlap = minimumDistance - separationDistance;
        const relaxedOverlap = overlap * SEPARATION_RELAXATION;
        const maxCorrectionDistance =
            SEPARATION_MAX_CORRECTION_SPEED * deltaTime;

        const isFirstMoving = this.isActorMoving(firstNavigation);
        const isSecondMoving = this.isActorMoving(secondNavigation);
        let firstCorrectionShare = 0.5;
        let secondCorrectionShare = 0.5;
        if (isFirstMoving && !isSecondMoving) {
            firstCorrectionShare = 1;
            secondCorrectionShare = 0;
        } else if (isSecondMoving && !isFirstMoving) {
            firstCorrectionShare = 0;
            secondCorrectionShare = 1;
        }

        let firstCorrectionDistance = relaxedOverlap * firstCorrectionShare;
        let secondCorrectionDistance = relaxedOverlap * secondCorrectionShare;
        if (firstCorrectionDistance > maxCorrectionDistance) {
            firstCorrectionDistance = maxCorrectionDistance;
        }
        if (secondCorrectionDistance > maxCorrectionDistance) {
            secondCorrectionDistance = maxCorrectionDistance;
        }
        if (firstCorrectionDistance <= 0 && secondCorrectionDistance <= 0) {
            return false;
        }

        this.applySpacingCorrection(
            firstEid,
            firstNavigation,
            separationDirection.scale(firstCorrectionDistance),
        );
        this.applySpacingCorrection(
            secondEid,
            secondNavigation,
            separationDirection.scale(-secondCorrectionDistance),
        );
        return true;
    }

    private applySpacingCorrection(
        entityId: EntityId,
        navigationComponent: ActorNavigationComponent,
        correction: Vector3,
    ) {
        if (correction.lengthSquared() < 0.000001) {
            return;
        }

        navigationComponent.position.addInPlace(correction);
        navigationComponent.position.y = ACTOR_GROUND_Y;

        syncActorWorldSprite(entityId, navigationComponent.position);
    }

    private isActorMoving(
        navigationComponent: ActorNavigationComponent,
    ): boolean {
        return navigationComponent.isNavigating;
    }

    private resolveEnvironmentCollisions() {
        const environmentObstacles = getNavigationObstacles();
        if (environmentObstacles.length === 0) {
            return;
        }

        const navigationComponentArray = getActorNavigationComponentArray();
        const collisionComponentArray = getCollisionComponentArray();

        for (const entityId of query(this.gameScene.world, [
            navigationComponentArray,
        ])) {
            const navigationComponent = navigationComponentArray[entityId];
            if (!navigationComponent) {
                continue;
            }

            const actorCollision = collisionComponentArray[entityId];
            const actorRadius = actorCollision
                ? cmToMeters(actorCollision.radius)
                : cmToMeters(DEFAULT_ACTOR_COLLISION_RADIUS);

            let correctionX = 0;
            let correctionZ = 0;

            for (const obstacle of environmentObstacles) {
                const offsetX =
                    navigationComponent.position.x - obstacle.center.x;
                const offsetZ =
                    navigationComponent.position.z - obstacle.center.z;
                const cosYaw = Math.cos(obstacle.yaw);
                const sinYaw = Math.sin(obstacle.yaw);

                const localX = offsetX * cosYaw - offsetZ * sinYaw;
                const localZ = offsetX * sinYaw + offsetZ * cosYaw;

                const closestX = clamp(
                    localX,
                    -obstacle.halfExtents.x,
                    obstacle.halfExtents.x,
                );
                const closestZ = clamp(
                    localZ,
                    -obstacle.halfExtents.z,
                    obstacle.halfExtents.z,
                );
                const pushDirectionX = localX - closestX;
                const pushDirectionZ = localZ - closestZ;
                const pushDistance = Math.sqrt(
                    pushDirectionX * pushDirectionX +
                        pushDirectionZ * pushDirectionZ,
                );
                const minimumDistance = actorRadius + ACTOR_SPACING_MARGIN;

                if (pushDistance > minimumDistance) {
                    continue;
                }

                let localCorrectionX = 0;
                let localCorrectionZ = 0;
                if (pushDistance > 0.0001) {
                    const pushScale =
                        (minimumDistance - pushDistance) / pushDistance;
                    localCorrectionX = pushDirectionX * pushScale;
                    localCorrectionZ = pushDirectionZ * pushScale;
                } else {
                    const overlapX = obstacle.halfExtents.x - Math.abs(localX);
                    const overlapZ = obstacle.halfExtents.z - Math.abs(localZ);
                    if (overlapX < overlapZ) {
                        localCorrectionX =
                            localX >= 0
                                ? overlapX + minimumDistance
                                : -(overlapX + minimumDistance);
                    } else {
                        localCorrectionZ =
                            localZ >= 0
                                ? overlapZ + minimumDistance
                                : -(overlapZ + minimumDistance);
                    }
                }

                correctionX +=
                    localCorrectionX * cosYaw + localCorrectionZ * sinYaw;
                correctionZ +=
                    -localCorrectionX * sinYaw + localCorrectionZ * cosYaw;
            }

            if (correctionX !== 0 || correctionZ !== 0) {
                const correctionDistance = Math.sqrt(
                    correctionX * correctionX + correctionZ * correctionZ,
                );

                if (
                    navigationComponent.agentIndex >= 0 &&
                    correctionDistance <= SEPARATION_TELEPORT_THRESHOLD
                ) {
                    continue;
                }

                navigationComponent.position.x += correctionX;
                navigationComponent.position.z += correctionZ;
                navigationComponent.position.y = ACTOR_GROUND_Y;

                if (navigationComponent.agentIndex >= 0) {
                    teleportNavigationAgent(
                        entityId,
                        navigationComponent.position,
                    );
                }

                syncActorWorldSprite(entityId, navigationComponent.position);
            }
        }
    }
}
