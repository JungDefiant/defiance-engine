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
			this.tickActionTimer(deltaTime, actorState);
			this.tickLifeRegen(deltaTime, actorState);
			this.tickWillRegen(deltaTime, actorState);
			this.tickWillCostPerSecond(deltaTime, actorState);
		}
	}

	private tickActionTimer(
		deltaTime: number,
		actorState: ActorStateComponent,
	) {
		if (!actorState.queuedAction) {
			return;
		}

		const actionTimerAttribute = actorState.attributes.actionTimer;
		const speedAttribute = actorState.attributes.speed;

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

	private tickLifeRegen(deltaTime: number, actorState: ActorStateComponent) {
		const lifeRegenTimerAttribute = actorState.attributes.lifeRegenTimer;
		const lifeAttribute = actorState.attributes.lifePoints;

		if (lifeAttribute.currentValue < lifeAttribute.maximumValue) {
			lifeRegenTimerAttribute.currentValue += deltaTime;

			if (
				lifeRegenTimerAttribute.currentValue >=
				lifeRegenTimerAttribute.maximumValue
			) {
				lifeAttribute.currentValue = Math.min(
					lifeAttribute.currentValue + 1,
					lifeAttribute.maximumValue,
				);
				lifeRegenTimerAttribute.currentValue = 0;
			}
		}
	}

	private tickWillRegen(deltaTime: number, actorState: ActorStateComponent) {
		const willRegenTimerAttribute = actorState.attributes.willRegenTimer;
		const willAttribute = actorState.attributes.willPoints;

		if (willAttribute.currentValue < willAttribute.maximumValue) {
			willRegenTimerAttribute.currentValue += deltaTime;

			if (
				willRegenTimerAttribute.currentValue >=
				willRegenTimerAttribute.maximumValue
			) {
				willAttribute.currentValue = Math.min(
					willAttribute.currentValue + 1,
					willAttribute.maximumValue,
				);
				willRegenTimerAttribute.currentValue = 0;
			}
		}
	}

	private tickWillCostPerSecond(
		deltaTime: number,
		actorData: ActorStateComponent,
	) {
		const willCostPerSecondAttribute =
			actorData.attributes.willCostPerSecond;
		const willCostTimerAttribute = actorData.attributes.willCostTimer;
		const willAttribute = actorData.attributes.willPoints;

		if (willCostPerSecondAttribute.currentValue > 0) {
			willCostTimerAttribute.currentValue += deltaTime;

			if (
				willCostTimerAttribute.currentValue >=
				willCostTimerAttribute.maximumValue
			) {
				willAttribute.currentValue = Math.max(
					willAttribute.currentValue -
						willCostPerSecondAttribute.currentValue,
					0,
				);
			}

			if (willAttribute.currentValue === 0) {
				// Disable toggles
			}
		}
	}
}
