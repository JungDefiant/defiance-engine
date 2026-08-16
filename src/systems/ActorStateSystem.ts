import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { query } from "bitecs";
import ActorStateComponent from "../components/ActorStateComponent";
import ControlState from "src/states/ControlState";
import { GameScene } from "src/scenes/GameScene";
import { getControlState, getGameScene } from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";

export const SYSTEM_ID_ACTORSTATE = "ActorState";

export default class ActorStateSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public async start() {}

	public update(deltaTime: number): void {
		const controlState = getControlState();

		if (controlState.actionPauseSet.size > 0) {
			return;
		}

		this.tickRecoveryRegenOnAllActors(deltaTime);
	}

	private tickRecoveryRegenOnAllActors(deltaTime: number) {
		const actorStateComponentArray = getActorStateComponentArray();
		for (const eid of query(getGameScene().world, [
			actorStateComponentArray,
		])) {
			const actorState = actorStateComponentArray[eid];
			if (actorState.isDefeated) {
				return;
			}
			this.tickRecovery(deltaTime, actorState);
			this.tickRegen(deltaTime, actorState);
		}
	}

	private tickRecovery(deltaTime: number, actorData: ActorStateComponent) {
		const spdAttr = actorData.attributes.speed;
		const rcvyAttr = actorData.attributes.recovery;

		if (rcvyAttr.currentValue < rcvyAttr.maximumValue) {
			const amount = deltaTime * (10 / spdAttr.currentValue);
			const newRcvyAttrVal = rcvyAttr.currentValue + amount;
			rcvyAttr.currentValue = Math.min(
				newRcvyAttrVal,
				rcvyAttr.maximumValue,
			);
		}
	}

	private tickRegen(deltaTime: number, actorData: ActorStateComponent) {
		const regnTimerAttr = actorData.attributes.regenTimer;
		const lifeAttr = actorData.attributes.life;

		regnTimerAttr.currentValue += deltaTime;

		if (
			regnTimerAttr.currentValue >= regnTimerAttr.maximumValue &&
			lifeAttr.currentValue < lifeAttr.maximumValue
		) {
			lifeAttr.currentValue = Math.min(
				lifeAttr.currentValue + 1,
				lifeAttr.maximumValue,
			);
			regnTimerAttr.currentValue = 0;
		}
	}
}
