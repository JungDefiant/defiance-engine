import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { ICrowd, Nullable, Vector3 } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import { GameScene } from "src/scenes/GameScene";
import {
    getActorNavigationComponentArray,
    getActorStateComponentArray,
    getCharacterSpriteComponentArray,
    getCollisionComponentArray,
} from "src/modules/ComponentModule";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import {
    getNavigationCrowd,
    getNavigationObstacles,
    teleportNavigationAgent,
} from "src/modules/ActorNavigationModule";
import { updateIsometricCameraFollow } from "src/modules/CameraModule";
import { clamp, cmToMeters } from "src/modules/Utils";
import {
    ACTOR_GROUND_Y,
    ACTOR_SPRITE_VERTICAL_OFFSET,
    PAUSE_DIALOGUE,
} from "src/constants/GeneralConstants";
import ControlState from "src/states/ControlState";
import CollisionComponent from "src/components/CollisionComponent";
import {
    ACTOR_SPACING_MARGIN,
    DEFAULT_ACTOR_COLLISION_RADIUS,
    NAV_ARRIVE_DISTANCE,
    NAV_FACING_MIN_SPEED,
    SEPARATION_ITERATIONS,
    SEPARATION_MAX_CORRECTION_SPEED,
    SEPARATION_RELAXATION,
    SEPARATION_TELEPORT_THRESHOLD,
} from "src/constants/NavigationConstants";

export default class ActorNavigationSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
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
            this.syncActorWorldSprite(entityId, navigationComponent.position);
        }

        this.resolveActorSpacing(deltaTime);
        this.resolveEnvironmentCollisions();
        this.updateIsometricCameraFollow(controlState);
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

    private syncActorWorldSprite(
        entityId: EntityId,
        navigationPosition: Vector3,
    ) {
        const characterSprite = getCharacterSpriteComponentArray()[entityId];
        if (characterSprite) {
            characterSprite.getValue().position.copyFrom(navigationPosition);
            characterSprite.getValue().position.y =
                navigationPosition.y + ACTOR_SPRITE_VERTICAL_OFFSET;
        }
    }

    private resolveActorSpacing(deltaTime: number) {
        const navigationComponentArray = getActorNavigationComponentArray();
        const collisionComponentArray = getCollisionComponentArray();
        const actorStateComponentArray = getActorStateComponentArray();
        const characterSpriteComponentArray =
            getCharacterSpriteComponentArray();
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
                        characterSpriteComponentArray,
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
        characterSpriteComponentArray: Array<
            CharacterSpriteComponent | undefined
        >,
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
            characterSpriteComponentArray,
        );
        this.applySpacingCorrection(
            secondEid,
            secondNavigation,
            separationDirection.scale(-secondCorrectionDistance),
            characterSpriteComponentArray,
        );
        return true;
    }

    private applySpacingCorrection(
        entityId: EntityId,
        navigationComponent: ActorNavigationComponent,
        correction: Vector3,
        characterSpriteComponentArray: Array<
            CharacterSpriteComponent | undefined
        >,
    ) {
        if (correction.lengthSquared() < 0.000001) {
            return;
        }

        navigationComponent.position.addInPlace(correction);
        navigationComponent.position.y = ACTOR_GROUND_Y;

        this.syncActorWorldSprite(entityId, navigationComponent.position);
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

                this.syncActorWorldSprite(
                    entityId,
                    navigationComponent.position,
                );
            }
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

    private updateIsometricCameraFollow(controlState: ControlState) {
        if (controlState.actionPauseSet.has(PAUSE_DIALOGUE)) {
            return;
        }

        const gameplayState = getGameplayState();
        const navigationComponentArray = getActorNavigationComponentArray();
        const selectedNavigation: Nullable<ActorNavigationComponent> =
            navigationComponentArray[gameplayState.selectedPlayerEID] ?? null;
        if (!selectedNavigation) {
            return;
        }

        updateIsometricCameraFollow(selectedNavigation.position);
    }
}
