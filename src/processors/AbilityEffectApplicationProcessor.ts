import { Processor } from "./Processor";
import { AbilityEffectType, EffectVariable } from "src/types/AbilityTypes";
import {
	applyDamageEffect,
	applyHealEffect,
	applyStatusEffect,
	EffectFunctionProps,
} from "src/modules/EffectModule";

export type AbilityEffectApplicationFunction = (
	props: EffectFunctionProps,
) => void;

export class AbilityEffectApplicationProcessor implements Processor {
	private processorFunctions: Record<
		AbilityEffectType,
		AbilityEffectApplicationFunction
	>;

	public constructor() {
		this.processorFunctions = {
			damage: (props: EffectFunctionProps) => applyDamageEffect(props),
			healing: (props: EffectFunctionProps) => applyHealEffect(props),
			status: (props: EffectFunctionProps) => applyStatusEffect(props),
			attributeModifier: (props: EffectFunctionProps) => {},
			modifyContextVariable: (props: EffectFunctionProps) => {},
		};
	}

	public setProcessorFunction(
		key: string,
		value: AbilityEffectApplicationFunction,
	): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = value;
	}

	public removeProcessorFunction(key: string): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = (props: EffectFunctionProps) => {};
	}

	public getProcessorFunction(key: string): AbilityEffectApplicationFunction {
		const parsedKey = key as AbilityEffectType;
		return this.processorFunctions[parsedKey];
	}
}
