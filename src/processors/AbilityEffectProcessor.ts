import { Processor } from "./Processor";
import { AbilityEffectType } from "src/types/AbilityTypes";
import {
	applyCriticalEffect,
	applyDamageEffect,
	applyHealEffect,
	applyModifyContextVariable,
	applyStatusEffect,
	EffectFunctionProps,
} from "src/modules/EffectModule";

export type AbilityEffectFunction = (props: EffectFunctionProps) => void;

export class AbilityEffectProcessor implements Processor {
	private processorFunctions: Record<
		AbilityEffectType,
		AbilityEffectFunction
	>;

	public constructor() {
		this.processorFunctions = {
			damage: (props: EffectFunctionProps) => applyDamageEffect(props),
			healing: (props: EffectFunctionProps) => applyHealEffect(props),
			status: (props: EffectFunctionProps) => applyStatusEffect(props),
			critical: (props: EffectFunctionProps) =>
				applyCriticalEffect(props),
			modifyContextVariable: (props: EffectFunctionProps) =>
				applyModifyContextVariable(props),
		};
	}

	public setProcessorFunction(
		key: string,
		value: AbilityEffectFunction,
	): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = value;
	}

	public removeProcessorFunction(key: string): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = (props: EffectFunctionProps) => [];
	}

	public getProcessorFunction(key: string): AbilityEffectFunction {
		const parsedKey = key as AbilityEffectType;
		return this.processorFunctions[parsedKey];
	}
}
