import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
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
import { clamp } from "src/modules/Utils";
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
		const characterSpriteComponentArray =
			getCharacterSpriteComponentArray();

		for (const eid of query(this.gameScene.world, [
			navigationComponentArray,
		])) {
			const navigationComponent = navigationComponentArray[eid];
			if (!navigationComponent) {
				continue;
			}

			if (navigationCrowd && navigationComponent.agentIndex >= 0) {
				const agentPosition = navigationCrowd.getAgentPosition(
					navigationComponent.agentIndex,
				);
				if (agentPosition) {
					navigationComponent.position.copyFrom(agentPosition);
				}
				const agentVelocity = navigationCrowd.getAgentVelocity(
					navigationComponent.agentIndex,
				);
				if (agentVelocity && agentVelocity.lengthSquared() > 0.0001) {
					const horizontalVelocity = new Vector3(
						agentVelocity.x,
						0,
						agentVelocity.z,
					);
					if (horizontalVelocity.lengthSquared() > 0.0001) {
						navigationComponent.facingDirection.copyFrom(
							horizontalVelocity.normalize(),
						);
					}
				}
			} else if (
				navigationComponent.isNavigating &&
				navigationComponent.destination
			) {
				this.moveDirectlyTowardsDestination(
					deltaTime,
					navigationComponent,
				);
			}

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

			const characterSprite = characterSpriteComponentArray[eid];
			if (characterSprite) {
				this.syncActorWorldSprite(
					characterSprite,
					navigationComponent.position,
				);
			}
		}

		this.resolveActorSpacing();
		this.resolveEnvironmentCollisions();
		this.updateIsometricCameraFollow(controlState);
	}

	private syncActorWorldSprite(
		characterSprite: CharacterSpriteComponent,
		navigationPosition: Vector3,
	) {
		characterSprite.getValue().position.copyFrom(navigationPosition);
		characterSprite.getValue().position.y =
			navigationPosition.y + ACTOR_SPRITE_VERTICAL_OFFSET;
	}

	private resolveActorSpacing() {
		const navigationComponentArray = getActorNavigationComponentArray();
		const collisionComponentArray = getCollisionComponentArray();
		const actorStateComponentArray = getActorStateComponentArray();
		const characterSpriteComponentArray =
			getCharacterSpriteComponentArray();
		const navigatingEids = query(this.gameScene.world, [
			navigationComponentArray,
		]);

		for (let i = 0; i < navigatingEids.length; i++) {
			for (let j = i + 1; j < navigatingEids.length; j++) {
				const firstEid = navigatingEids[i];
				const secondEid = navigatingEids[j];
				const firstNavigation =
					navigationComponentArray[firstEid] ?? null;
				const secondNavigation =
					navigationComponentArray[secondEid] ?? null;
				if (!firstNavigation || !secondNavigation) {
					continue;
				}

				if (
					firstNavigation.agentIndex >= 0 ||
					secondNavigation.agentIndex >= 0
				) {
					continue;
				}

				const firstActorState = actorStateComponentArray[firstEid];
				const secondActorState = actorStateComponentArray[secondEid];
				if (
					(firstActorState && firstActorState.isDefeated) ||
					(secondActorState && secondActorState.isDefeated)
				) {
					continue;
				}

				const firstCollision: CollisionComponent | undefined =
					collisionComponentArray[firstEid];
				const secondCollision: CollisionComponent | undefined =
					collisionComponentArray[secondEid];
				const firstRadius = firstCollision
					? firstCollision.radius
					: DEFAULT_ACTOR_COLLISION_RADIUS;
				const secondRadius = secondCollision
					? secondCollision.radius
					: DEFAULT_ACTOR_COLLISION_RADIUS;
				const minimumDistance =
					firstRadius + secondRadius + ACTOR_SPACING_MARGIN;

				const separationVector = firstNavigation.position.subtract(
					secondNavigation.position,
				);
				separationVector.y = 0;
				let separationDistance = separationVector.length();
				if (separationDistance >= minimumDistance) {
					continue;
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

				this.applySpacingCorrection(
					firstEid,
					firstNavigation,
					separationDirection.scale(overlap * firstCorrectionShare),
					characterSpriteComponentArray,
				);
				this.applySpacingCorrection(
					secondEid,
					secondNavigation,
					separationDirection.scale(-overlap * secondCorrectionShare),
					characterSpriteComponentArray,
				);
			}
		}
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

		const characterSprite = characterSpriteComponentArray[entityId];
		if (characterSprite) {
			this.syncActorWorldSprite(
				characterSprite,
				navigationComponent.position,
			);
		}
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
		const characterSpriteComponentArray =
			getCharacterSpriteComponentArray();

		for (const eid of query(this.gameScene.world, [
			navigationComponentArray,
		])) {
			const navigationComponent = navigationComponentArray[eid];
			if (!navigationComponent) {
				continue;
			}

			const actorCollision = collisionComponentArray[eid];
			const actorRadius = actorCollision
				? actorCollision.radius
				: DEFAULT_ACTOR_COLLISION_RADIUS;

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
				navigationComponent.position.x += correctionX;
				navigationComponent.position.z += correctionZ;
				navigationComponent.position.y = ACTOR_GROUND_Y;

				if (navigationComponent.agentIndex >= 0) {
					teleportNavigationAgent(eid, navigationComponent.position);
				}

				const characterSprite = characterSpriteComponentArray[eid];
				if (characterSprite) {
					this.syncActorWorldSprite(
						characterSprite,
						navigationComponent.position,
					);
				}
			}
		}
	}

	private moveDirectlyTowardsDestination(
		deltaTime: number,
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
			deltaTime * navigationComponent.speed,
			distanceLeft,
		);
		const lerpAmount = distanceMoved / distanceLeft;
		const moveTowardsVector = Vector3.Lerp(
			navigationComponent.position,
			destination,
			lerpAmount,
		);
		navigationComponent.position.copyFrom(moveTowardsVector);

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
