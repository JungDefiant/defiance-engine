import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { Engine, Vector3 } from "@babylonjs/core";
import { EntityId, query, removeComponent } from "bitecs";
import { EntityMovementComponent } from "src/components/EntityMovementComponent";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";

export const SYSTEM_ID_ENTITYMOVEMENT = "EntityMovement";

export default class EntityMovementSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number): void {
		for (const eid of query(gameState.world, [gameState.EntityMovement])) {
			const entityMovement = gameState.EntityMovement[eid];
			this.moveEntityTowardsDestination(deltaTime, entityMovement);
			if (this.checkIfEntityAtDestination(eid, gameState)) {
				entityMovement.onDestinationReachedEvent();
				removeComponent(gameState.world, eid, gameState.EntityMovement);
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
		eid: EntityId,
		gameState: GameState,
	): boolean {
		const entityMovement = gameState.EntityMovement[eid];
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
