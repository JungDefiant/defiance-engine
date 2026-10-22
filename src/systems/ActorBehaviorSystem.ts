import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { query } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import { getActorBehaviorComponentArray } from "src/modules/ComponentModule";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import {
	decideActionByBehavior,
	updatePartyFollowFormation,
	updateSelectedPlayerAutoAttack,
} from "src/modules/ActorBehaviorModule";
import { CombatState } from "./CombatManagerSystem";

export default class ActorBehaviorSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const controlState = getControlState();
		if (controlState.actionPauseSet.size > 0) {
			return;
		}

		const gameplayState = getGameplayState();
		if (gameplayState.combatState === CombatState.Inactive) {
			if (controlState.controlPauseSet.size > 0) {
				return;
			}
			updatePartyFollowFormation();
			return;
		}

		updateSelectedPlayerAutoAttack();

		const behaviorComponentArray = getActorBehaviorComponentArray();
		for (const eid of query(this.gameScene.world, [
			behaviorComponentArray,
		])) {
			decideActionByBehavior(eid);
		}
	}
}
