import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { Vector3 } from "@babylonjs/core";
import { query, removeComponent } from "bitecs";
import EntityMovementComponent from "src/components/EntityMovementComponent";
import { GameScene } from "src/scenes/GameScene";
import { getEntityMovementComponentArray } from "src/modules/ComponentModule";

export default class EntityMovementSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const world = this.gameScene.world;
		const entityMovementComponentArray = getEntityMovementComponentArray();

		for (const eid of query(world, [entityMovementComponentArray])) {
			const entityMovement = entityMovementComponentArray[eid];
			this.moveEntityTowardsDestination(deltaTime, entityMovement);
			if (this.checkIfEntityAtDestination(entityMovement)) {
				entityMovement.onDestinationReachedEvent();
				removeComponent(world, eid, entityMovementComponentArray);
			}
		}
	}

	private moveEntityTowardsDestination(
		deltaTime: number,
		entityMovement: EntityMovementComponent,
	) {
		const position = entityMovement.position;
		const destination = entityMovement.destination;

		const distanceLeft = Vector3.Distance(position, destination);

		let distanceMoved = deltaTime * entityMovement.speed;
		if (distanceMoved > distanceLeft) {
			distanceMoved = distanceLeft;
		}

		if (distanceLeft !== 0) {
			const lerpAmount = distanceMoved / distanceLeft;
			const moveTowardsVector = Vector3.Lerp(
				position,
				destination,
				lerpAmount,
			);
			position._x = moveTowardsVector.x;
			position._y = moveTowardsVector.y;
			position._z = moveTowardsVector.z;
		} else {
			position._x = destination.x;
			position._y = destination.y;
			position._z = destination.z;
		}
	}

	private checkIfEntityAtDestination(
		entityMovement: EntityMovementComponent,
	): boolean {
		const distanceLeft = Vector3.Distance(
			entityMovement.position,
			entityMovement.destination,
		);

		if (distanceLeft <= 0.1) {
			return true;
		}

		return false;
	}
}
