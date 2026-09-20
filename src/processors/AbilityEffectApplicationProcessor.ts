import { Processor } from "./Processor";
import { AbilityEffectType } from "src/types/AbilityTypes";
import {
	applyDamageEffect,
	applyHealEffect,
	applyStatusEffect,
	EffectApplicationFunctionProps,
} from "src/modules/EffectModule";

export type AbilityEffectApplicationFunction = (
	props: EffectApplicationFunctionProps,
) => void;

export class AbilityEffectApplicationProcessor implements Processor {
	private processorFunctions: Record<
		AbilityEffectType,
		AbilityEffectApplicationFunction
	>;

	public constructor() {
		this.processorFunctions = {
			damage: (props: EffectApplicationFunctionProps) =>
				applyDamageEffect(props),
			healing: (props: EffectApplicationFunctionProps) =>
				applyHealEffect(props),
			status: (props: EffectApplicationFunctionProps) =>
				applyStatusEffect(props),
			attributeModifier: (props: EffectApplicationFunctionProps) => {},
			modifyContextVariable: (
				props: EffectApplicationFunctionProps,
			) => {},
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
		this.processorFunctions[parsedKey] = (
			props: EffectApplicationFunctionProps,
		) => {};
	}

	public getProcessorFunction(key: string): AbilityEffectApplicationFunction {
		const parsedKey = key as AbilityEffectType;
		return this.processorFunctions[parsedKey];
	}
}
