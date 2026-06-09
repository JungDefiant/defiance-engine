import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import GameState from "../GameState";
import { query } from "bitecs";
import { ActorData } from "../components/ActorData";

@singleton()
export default class ActorStateSystem implements ISystem {
	private rcvyTickAccumulator: number = 0;
	private regnTickAccumulator: number = 0;

	private readonly regnTicks: number = 5;

	public async start() {}

	public update(deltaTime: number): void {
		const gameState = container.resolve(GameState);

		if (gameState.actionPauseSet.size > 0) {
			return;
		}

		this.processRecoveryRegen(gameState, deltaTime);
	}

	private processRecoveryRegen(gameState: GameState, deltaTime: number) {
		this.rcvyTickAccumulator += deltaTime;
		this.regnTickAccumulator += deltaTime;

		for (const eid of query(gameState.world, [gameState.ActorDataComponent])) {
			const actorData = gameState.ActorDataComponent[eid];
			if (actorData.isDefeated) {
				return;
			}
			this.tickRecovery(deltaTime, actorData);
			this.tickRegen(actorData);
		}

		this.regnTickAccumulator =
			Math.floor(this.regnTickAccumulator / this.regnTicks) +
			(this.regnTickAccumulator % this.regnTicks);
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

	private tickRegen(actorData: ActorData) {
		const regnAttr = actorData.attributes.regen;
		const lifeAttr = actorData.attributes.life;

		if (lifeAttr.currentValue < lifeAttr.maximumValue) {
			const amount =
				Math.floor(this.regnTickAccumulator / this.regnTicks) *
				regnAttr.currentValue;
			const newLifeAttrVal = lifeAttr.currentValue + amount;

			lifeAttr.currentValue = Math.min(newLifeAttrVal, lifeAttr.maximumValue);
		}
	}
}
