import { singleton } from "tsyringe";
import { Processor } from "./Processor";
import { applyDamageEffect, applyHealEffect } from "src/modules/EffectModule";

type AbilityEffectType = "DamageEffect" | "HealingEffect";

@singleton()
export class AbilityEffectProcessor implements Processor<
	AbilityEffectType,
	Function
> {
	private records: Record<AbilityEffectType, Function>;

	public constructor() {
		this.records = {
			DamageEffect: applyDamageEffect,
			HealingEffect: applyHealEffect,
		};
	}

	public setRecord(key: AbilityEffectType, value: Function): void {
		this.records[key] = value;
	}

	public removeRecord(key: AbilityEffectType): void {
		this.records[key] = () => {};
	}

	public getRecord(key: AbilityEffectType): Function {
		return this.records[key];
	}
}
