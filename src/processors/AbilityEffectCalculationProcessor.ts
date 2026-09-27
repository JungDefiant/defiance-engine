import { Processor } from "./Processor";
import {
	AbilityEffectCalculationFunction,
	AbilityEffectType,
	EffectCalculationFunctionProps,
} from "src/types/AbilityTypes";
import {
	calculateAttributeModifier,
	calculateContextVariableModifier,
	calculateDamageEffect,
	calculateHealEffect,
	calculateStatusEffect,
} from "src/modules/EffectModule";

export class AbilityEffectCalculationProcessor implements Processor {
	private processorFunctions: Record<
		AbilityEffectType,
		AbilityEffectCalculationFunction
	>;

	public constructor() {
		this.processorFunctions = {
			damage: (props: EffectCalculationFunctionProps) =>
				calculateDamageEffect(props),
			healing: (props: EffectCalculationFunctionProps) =>
				calculateHealEffect(props),
			status: (props: EffectCalculationFunctionProps) =>
				calculateStatusEffect(props),
			attributeModifier: (props: EffectCalculationFunctionProps) =>
				calculateAttributeModifier(props),
			modifyContextVariable: (props: EffectCalculationFunctionProps) =>
				calculateContextVariableModifier(props),
		};
	}

	public setProcessorFunction(
		key: string,
		value: AbilityEffectCalculationFunction,
	): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = value;
	}

	public removeProcessorFunction(key: string): void {
		const parsedKey = key as AbilityEffectType;
		this.processorFunctions[parsedKey] = (
			props: EffectCalculationFunctionProps,
		) => [];
	}

	public getProcessorFunction(key: string): AbilityEffectCalculationFunction {
		const parsedKey = key as AbilityEffectType;
		return this.processorFunctions[parsedKey];
	}
}
