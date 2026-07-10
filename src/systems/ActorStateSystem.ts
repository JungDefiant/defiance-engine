import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import GameState from "../states/GameState";
import { query } from "bitecs";
import { ActorData } from "../components/ActorData";

@singleton()
export default class ActorStateSystem implements ISystem {

	public async start() {}

	public update(deltaTime: number): void {
		const gameState = container.resolve(GameState);

		if (gameState.actionPauseSet.size > 0) {
			return;
		}

		this.processRecoveryRegen(gameState, deltaTime);
	}

	private processRecoveryRegen(gameState: GameState, deltaTime: number) {
		for (const eid of query(gameState.world, [gameState.ActorDataComponent])) {
			const actorData = gameState.ActorDataComponent[eid];
			if (actorData.isDefeated) {
				return;
			}
			this.tickRecovery(deltaTime, actorData);
			this.tickRegen(deltaTime, actorData);
		}
	}

	private tickRecovery(deltaTime: number, actorData: ActorData) {
		const spdAttr = actorData.attributes.speed;
		const rcvyAttr = actorData.attributes.recovery;

		if (rcvyAttr.currentValue < rcvyAttr.maximumValue) {
			const amount = deltaTime * (10 / spdAttr.currentValue);
			const newRcvyAttrVal = rcvyAttr.currentValue + amount;
			rcvyAttr.currentValue = Math.min(newRcvyAttrVal, rcvyAttr.maximumValue);
		}
	}

	private tickRegen(deltaTime: number, actorData: ActorData) {
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
