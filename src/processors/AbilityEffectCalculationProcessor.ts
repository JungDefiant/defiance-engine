import { Processor } from "./Processor";
import { AbilityEffectType, EffectVariable } from "src/types/AbilityTypes";
import {
	calculateAttributeModifier,
	calculateContextVariableModifier,
	calculateDamageEffect,
	calculateHealEffect,
	calculateStatusEffect,
	EffectFunctionProps,
} from "src/modules/EffectModule";
import { Effect } from "babylonjs";

export type AbilityEffectCalculationFunction = (
	props: EffectFunctionProps,
	effectVariables: { [index: string]: EffectVariable },
) => void;

export class AbilityEffectCalculationProcessor implements Processor {
	private processorFunctions: Record<
		AbilityEffectType,
		AbilityEffectCalculationFunction
	>;

	public constructor() {
		this.processorFunctions = {
			damage: (
				props: EffectFunctionProps,
				effectVariables: { [index: string]: EffectVariable },
			) => calculateDamageEffect(props, effectVariables),
			healing: (
				props: EffectFunctionProps,
				effectVariables: { [index: string]: EffectVariable },
			) => calculateHealEffect(props, effectVariables),
			status: (
				props: EffectFunctionProps,
				effectVariables: { [index: string]: EffectVariable },
			) => calculateStatusEffect(props, effectVariables),
			attributeModifier: (
				props: EffectFunctionProps,
				effectVariables: { [index: string]: EffectVariable },
			) => calculateAttributeModifier(props, effectVariables),
			modifyContextVariable: (
				props: EffectFunctionProps,
				effectVariables: { [index: string]: EffectVariable },
			) => calculateContextVariableModifier(props, effectVariables),
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
		this.processorFunctions[parsedKey] = (props: EffectFunctionProps) => [];
	}

	public getProcessorFunction(key: string): AbilityEffectCalculationFunction {
		const parsedKey = key as AbilityEffectType;
		return this.processorFunctions[parsedKey];
	}
}
