import { container, delay, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import GameContext from "../GameContext";
import { query } from "bitecs";
import { ActorData } from "../components/ActorData";
import CombatManagerSystem from "./CombatManagerSystem";

@singleton()
export default class ActorStateSystem implements ISystem {
	private rcvyTickAccumulator: number = 0;
	private regnTickAccumulator: number = 0;

	private readonly regnTicks: number = 5;

	public constructor(
		@inject(delay(() => CombatManagerSystem))
		private cmSystem: CombatManagerSystem,
	) {}

	public async start() {}

	public update(deltaTime: number): void {
		if (this.cmSystem.getPauseCombat()) {
			return;
		}

		const context = container.resolve(GameContext);
		this.rcvyTickAccumulator += deltaTime;
		this.regnTickAccumulator += deltaTime;

		for (const eid of query(context.world, [context.ActorDataComponent])) {
			const actorData = context.ActorDataComponent[eid];
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
