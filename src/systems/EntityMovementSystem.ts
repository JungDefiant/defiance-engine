import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { Engine, Vector3 } from "@babylonjs/core";
import { query, removeComponent } from "bitecs";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import SceneState from "src/states/SceneState";
import EntityMovementComponent from "src/components/EntityMovementComponent";

export const SYSTEM_ID_ENTITYMOVEMENT = "EntityMovement";

export default class EntityMovementSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number): void {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		const entityMovementComponentArray =
			sceneState.componentRegistry.getComponentArrayByComponentId<EntityMovementComponent>(
				EntityMovementComponent.toString(),
			);

		for (const eid of query(sceneState.world, [
			entityMovementComponentArray,
		])) {
			const entityMovement = entityMovementComponentArray[eid];
			this.moveEntityTowardsDestination(deltaTime, entityMovement);
			if (this.checkIfEntityAtDestination(entityMovement)) {
				entityMovement.onDestinationReachedEvent();
				removeComponent(
					sceneState.world,
					eid,
					entityMovementComponentArray,
				);
			}
		}
	}

	private moveEntityTowardsDestination(
		deltaTime: number,
		entityMovement: EntityMovementComponent,
	) {
		const transform = entityMovement.transform;
		const distanceLeft = Vector3.Distance(
			transform.position,
			entityMovement.destination,
		);

		let distanceMoved = deltaTime * entityMovement.speed;
		if (distanceMoved > distanceLeft) {
			distanceMoved = distanceLeft;
		}

		const lerpAmount = distanceMoved / distanceLeft;

		const moveTowardsVector = Vector3.Lerp(
			transform.position,
			entityMovement.destination,
			lerpAmount,
		);
		transform.setPositionWithLocalVector(moveTowardsVector);
	}

	private checkIfEntityAtDestination(
		entityMovement: EntityMovementComponent,
	): boolean {
		const distanceLeft = Vector3.Distance(
			entityMovement.transform.position,
			entityMovement.destination,
		);

		if (distanceLeft <= 0.1) {
			return true;
		}

		return false;
	}
}
