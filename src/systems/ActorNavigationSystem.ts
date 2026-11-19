import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { ICrowd, Vector3 } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import { GameScene } from "src/scenes/GameScene";
import {
    getActorNavigationComponentArray,
    getCollisionComponentArray,
} from "src/modules/ComponentModule";
import {
    getNavigationCrowd,
    getNavigationObstacles,
    syncActorWorldSprite,
} from "src/modules/ActorNavigationModule";
import { clamp, cmToMeters } from "src/modules/Utils";
import {
    ACTOR_SPACING_MARGIN,
    DEFAULT_ACTOR_COLLISION_RADIUS,
    NAV_ARRIVE_DISTANCE,
    NAV_FACING_MIN_SPEED,
} from "src/constants/NavigationConstants";
import CollisionComponent from "src/components/CollisionComponent";

export default class ActorNavigationSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const navigationCrowd = getNavigationCrowd();
        if (navigationCrowd) {
            navigationCrowd.update(deltaTime);
        }

        const navigationComponentArray = getActorNavigationComponentArray();

        for (const entityId of query(this.gameScene.world, [
            navigationComponentArray,
        ])) {
            const navigationComponent = navigationComponentArray[entityId];
            if (!navigationComponent) {
                continue;
            }

            if (navigationCrowd && navigationComponent.agentIndex >= 0) {
                this.syncPositionFromCrowd(
                    navigationCrowd,
                    navigationComponent,
                );
            } else if (
                navigationComponent.isNavigating &&
                navigationComponent.destination
            ) {
                this.moveDirectlyTowardsDestination(
                    deltaTime,
                    entityId,
                    navigationComponent,
                );
            }

            this.handleDestinationReached(navigationComponent);
            syncActorWorldSprite(entityId, navigationComponent.position);
        }
    }

    private handleDestinationReached(
        navigationComponent: ActorNavigationComponent,
    ) {
        if (
            navigationComponent.isNavigating &&
            navigationComponent.destination &&
            Vector3.Distance(
                navigationComponent.position,
                navigationComponent.destination,
            ) <= NAV_ARRIVE_DISTANCE
        ) {
            navigationComponent.isNavigating = false;
            navigationComponent.destination = null;
            const onArrive = navigationComponent.onDestinationReachedEvent;
            navigationComponent.onDestinationReachedEvent = null;
            if (onArrive) {
                onArrive();
            }
        }
    }

    private syncPositionFromCrowd(
        navigationCrowd: ICrowd,
        navigationComponent: ActorNavigationComponent,
    ) {
        const agentPosition = navigationCrowd.getAgentPosition(
            navigationComponent.agentIndex,
        );
        if (agentPosition) {
            navigationComponent.position.copyFrom(agentPosition);
        }
        const agentVelocity = navigationCrowd.getAgentVelocity(
            navigationComponent.agentIndex,
        );
        if (!agentVelocity) {
            return;
        }

        const horizontalVelocity = new Vector3(
            agentVelocity.x,
            0,
            agentVelocity.z,
        );
        if (horizontalVelocity.length() >= NAV_FACING_MIN_SPEED) {
            navigationComponent.facingDirection.copyFrom(
                horizontalVelocity.normalize(),
            );
        }
    }

    private moveDirectlyTowardsDestination(
        deltaTime: number,
        entityId: EntityId,
        navigationComponent: ActorNavigationComponent,
    ) {
        const destination = navigationComponent.destination!;
        const distanceLeft = Vector3.Distance(
            navigationComponent.position,
            destination,
        );
        if (distanceLeft <= 0.001) {
            return;
        }

        const distanceMoved = Math.min(
            deltaTime * cmToMeters(navigationComponent.speed),
            distanceLeft,
        );
        const lerpAmount = distanceMoved / distanceLeft;
        const desiredMovement = destination.subtract(
            navigationComponent.position,
        );
        desiredMovement.scaleInPlace(lerpAmount);

        const collisionComponent: CollisionComponent | undefined =
            getCollisionComponentArray()[entityId];
        const actorRadius = collisionComponent
            ? cmToMeters(collisionComponent.radius)
            : cmToMeters(DEFAULT_ACTOR_COLLISION_RADIUS);
        const movement = this.clipMovementAgainstObstacles(
            navigationComponent,
            desiredMovement,
            actorRadius,
        );

        navigationComponent.position.addInPlace(movement);

        const travelDirection = destination.subtract(
            navigationComponent.position,
        );
        travelDirection.y = 0;
        if (travelDirection.lengthSquared() > 0.0001) {
            navigationComponent.facingDirection.copyFrom(
                travelDirection.normalize(),
            );
        }
    }

    private clipMovementAgainstObstacles(
        navigationComponent: ActorNavigationComponent,
        movement: Vector3,
        actorRadius: number,
    ): Vector3 {
        const environmentObstacles = getNavigationObstacles();
        if (environmentObstacles.length === 0) {
            return movement;
        }

        const clippedMovement = movement.clone();
        const tentativePosition = new Vector3();
        const minimumDistance = actorRadius + ACTOR_SPACING_MARGIN;

        for (const obstacle of environmentObstacles) {
            tentativePosition.copyFrom(navigationComponent.position);
            tentativePosition.addInPlace(clippedMovement);

            const offsetX = tentativePosition.x - obstacle.center.x;
            const offsetZ = tentativePosition.z - obstacle.center.z;
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
            if (pushDistance >= minimumDistance) {
                continue;
            }

            let normalX = 0;
            let normalZ = 0;
            if (pushDistance > 0.0001) {
                normalX = pushDirectionX / pushDistance;
                normalZ = pushDirectionZ / pushDistance;
            } else if (
                obstacle.halfExtents.x - Math.abs(localX) <
                obstacle.halfExtents.z - Math.abs(localZ)
            ) {
                if (localX >= 0) {
                    normalX = 1;
                } else {
                    normalX = -1;
                }
            } else {
                if (localZ >= 0) {
                    normalZ = 1;
                } else {
                    normalZ = -1;
                }
            }

            const intoSurfaceDot =
                clippedMovement.x * normalX + clippedMovement.z * normalZ;
            if (intoSurfaceDot >= 0) {
                continue;
            }

            clippedMovement.x -= normalX * intoSurfaceDot;
            clippedMovement.z -= normalZ * intoSurfaceDot;
        }

        return clippedMovement;
    }
}
