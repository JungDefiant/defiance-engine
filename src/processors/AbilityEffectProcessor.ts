import { Processor } from "./Processor";
import { AbilityEffectType } from "src/types/AbilityTypes";
import { applyDamageEffect, applyHealEffect } from "src/modules/EffectModule";

export class AbilityEffectProcessor implements Processor {
	private processorFunctions: Record<AbilityEffectType, Function>;

	public constructor() {
		this.processorFunctions = {
			DamageEffect: applyDamageEffect,
			HealingEffect: applyHealEffect,
		};
	}

	public setProcessorFunction(key: string, value: Function): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = value;
	}

	public removeProcessorFunction(key: string): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = () => {};
	}

	public getProcessorFunction(key: string): Function {
		const parsedKey = key as AbilityEffectType;
		return this.processorFunctions[parsedKey];
	}
}
