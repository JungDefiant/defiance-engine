import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { query } from "bitecs";
import ActorStateComponent from "../components/ActorStateComponent";
import { GameScene } from "src/scenes/GameScene";
import { getControlState, getGameScene } from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";

export default class ActorStateSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const controlState = getControlState();

		if (controlState.actionPauseSet.size > 0) {
			return;
		}

		this.tickAttributeTimersOnAllActors(deltaTime);
	}

	private tickAttributeTimersOnAllActors(deltaTime: number) {
		const actorStateComponentArray = getActorStateComponentArray();
		for (const eid of query(getGameScene().world, [
			actorStateComponentArray,
		])) {
			const actorState = actorStateComponentArray[eid];
			if (actorState.isDefeated) {
				return;
			}
			this.tickAction(deltaTime, actorState);
			this.tickRegen(deltaTime, actorState);
			this.tickRecovery(deltaTime, actorState);
		}
	}

	private tickAction(deltaTime: number, actorData: ActorStateComponent) {
		if (!actorData.queuedAction) {
			return;
		}

		const actionTimerAttribute = actorData.attributes.actionTimer;
		const speedAttribute = actorData.attributes.speed;

		if (
			actionTimerAttribute.currentValue <
			actionTimerAttribute.maximumValue
		) {
			const amount = deltaTime * speedAttribute.currentValue;
			const newActionTimerAttributeValue =
				actionTimerAttribute.currentValue + amount;
			actionTimerAttribute.currentValue = Math.min(
				newActionTimerAttributeValue,
				actionTimerAttribute.maximumValue,
			);
		}
	}

	private tickRegen(deltaTime: number, actorData: ActorStateComponent) {
		const regenTimerAttribute = actorData.attributes.regenTimer;
		const lifeAttribute = actorData.attributes.life;

		if (lifeAttribute.currentValue < lifeAttribute.maximumValue) {
			regenTimerAttribute.currentValue += deltaTime;

			if (
				regenTimerAttribute.currentValue >=
				regenTimerAttribute.maximumValue
			) {
				lifeAttribute.currentValue = Math.min(
					lifeAttribute.currentValue + 1,
					lifeAttribute.maximumValue,
				);
				regenTimerAttribute.currentValue = 0;
			}
		}
	}

	private tickRecovery(deltaTime: number, actorData: ActorStateComponent) {
		const recoveryTimerAttribute = actorData.attributes.recoveryTimer;
		const willAttribute = actorData.attributes.will;

		if (willAttribute.currentValue < willAttribute.maximumValue) {
			recoveryTimerAttribute.currentValue += deltaTime;

			if (
				recoveryTimerAttribute.currentValue >=
				recoveryTimerAttribute.maximumValue
			) {
				willAttribute.currentValue = Math.min(
					willAttribute.currentValue + 1,
					willAttribute.maximumValue,
				);
				recoveryTimerAttribute.currentValue = 0;
			}
		}
	}
}
