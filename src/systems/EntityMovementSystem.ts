import { singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Engine, Vector3 } from "@babylonjs/core";
import GameState from "src/states/GameState";
import { EntityId, query, removeComponent } from "bitecs";
import { EntityMovementComponent } from "src/components/EntityMovementComponent";

@singleton()
export default class EntityMovementSystem implements ISystem {
	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number, gameState: GameState): void {
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
