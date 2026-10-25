import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { Vector3 } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import {
	getActorStateComponentArray,
	getCollisionComponentArray,
} from "src/modules/ComponentModule";
import { getControlState } from "src/modules/GameStateModule";
import {
	getActorPosition,
	triggerCollisionBehaviors,
} from "src/modules/Collision3DModule";

export default class Collision3DSystem implements GameSystem {
	private activeCollisionPairs: Set<string> = new Set();

	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const controlState = getControlState();
		if (controlState.actionPauseSet.size > 0) {
			return;
		}

		const collisionComponentArray = getCollisionComponentArray();
		const actorStateComponentArray = getActorStateComponentArray();
		const collidableEids = query(this.gameScene.world, [
			collisionComponentArray,
		]);

		for (let i = 0; i < collidableEids.length; i++) {
			for (let j = i + 1; j < collidableEids.length; j++) {
				const firstEid = collidableEids[i] as EntityId;
				const secondEid = collidableEids[j] as EntityId;

				const firstActorState = actorStateComponentArray[firstEid];
				const secondActorState = actorStateComponentArray[secondEid];
				if (
					(firstActorState && firstActorState.isDefeated) ||
					(secondActorState && secondActorState.isDefeated)
				) {
					continue;
				}

				const firstPosition = getActorPosition(firstEid);
				const secondPosition = getActorPosition(secondEid);
				if (!firstPosition || !secondPosition) {
					continue;
				}

				const firstCollision = collisionComponentArray[firstEid];
				const secondCollision = collisionComponentArray[secondEid];
				if (!firstCollision || !secondCollision) {
					continue;
				}

				const collisionDistance =
					firstCollision.radius + secondCollision.radius;
				const pairKey = `${Math.min(firstEid, secondEid)}:${Math.max(
					firstEid,
					secondEid,
				)}`;

				if (
					Vector3.Distance(firstPosition, secondPosition) <=
					collisionDistance
				) {
					if (!this.activeCollisionPairs.has(pairKey)) {
						this.activeCollisionPairs.add(pairKey);
						triggerCollisionBehaviors(firstEid, secondEid);
						triggerCollisionBehaviors(secondEid, firstEid);
					}
				} else {
					this.activeCollisionPairs.delete(pairKey);
				}
			}
		}
	}
}
