import { RandomRange } from "@babylonjs/core";
import ActorStateComponent, {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectData,
	EffectVariable,
} from "src/components/ActorStateComponent";
import { Themes } from "src/gui/Themes";
import { clamp } from "./Utils";
import { addFloatingTextRQE } from "./RenderModule";
import { defeatActor } from "./CombatModule";
import { getUserInterfaceState } from "./GameStateModule";
import { getAbilityEffectProcessor } from "./ProcessorModule";

export interface EffectFunctionProps {
	source: ActorStateComponent;
	target: ActorStateComponent;
	descriptors: AbilityDescriptor[];
	effectVariables: { [index: string]: EffectVariable };
}

export interface EffectFeedbackDetails {
	floatingText: string;
	floatingTextColor: string;
	combatLogText: string;
}

export function processAbilityEffects(
	sourceData: ActorStateComponent,
	targetData: ActorStateComponent,
	abilityData: AbilityData,
	context?: { [index: string]: EffectVariable },
) {
	let effectFeedbackDetails;
	const userInterfaceState = getUserInterfaceState();
	abilityData.effectData.forEach((effectData) => {
		const effectProcessor =
			getAbilityEffectProcessor().getProcessorFunction(effectData.id);
		effectFeedbackDetails = effectProcessor({
			source: sourceData,
			target: targetData,
			descriptors: abilityData.descriptors,
			effectVariables: {
				...effectData.variables,
				...context,
			},
		});
		effectFeedbackDetails.forEach((effectFeedbackDetails) => {
			addFloatingTextRQE(
				targetData.entityId,
				effectFeedbackDetails.floatingText,
				effectFeedbackDetails.floatingTextColor,
			);
			userInterfaceState.combatHud.addCombatLogEntry(
				`${sourceData.name} (${abilityData.name})`,
				effectFeedbackDetails.combatLogText,
			);
		});
	});
}

export function triggerFeatEffects(
	sourceData: ActorStateComponent,
	targetData: ActorStateComponent,
	trigger: AbilityTrigger,
	context?: { [index: string]: EffectVariable },
) {
	const triggeredFeats = sourceData.featData.filter(
		(x) => x.trigger === trigger,
	);
	triggeredFeats.forEach((feat) => {
		processAbilityEffects(sourceData, targetData, feat, context);
	});
}

export function applyDamageEffect(
	props: EffectFunctionProps,
): EffectFeedbackDetails[] {
	const targetLifeAttribute = props.target.attributes.life;
	const targetResistAttribute = props.target.attributes.resist;

	const damageAmount = props.effectVariables["amount"] as number;

	const damageContext = {
		effect: "damage",
		damage: damageAmount,
		damageMultiplier: 1,
		targetResist: targetResistAttribute.currentValue,
	};

	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorEffectInflicted,
		damageContext,
	);

	const totalDamageMultiplier =
		1 - Math.max(0, Math.min(damageContext.targetResist / 100, 100));

	const totalDamage = Math.floor(
		damageContext.damage * totalDamageMultiplier,
	);
	targetLifeAttribute.currentValue = clamp(
		targetLifeAttribute.currentValue - totalDamage,
		0,
		targetLifeAttribute.maximumValue,
	);

	const damageTakenContext = {
		effect: "damage",
		totalDamage,
	};

	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorEffectTaken,
		damageTakenContext,
	);

	if (targetLifeAttribute.currentValue === 0) {
		defeatActor(props.target);
	}

	const damageString = totalDamage.toString();
	return [
		{
			floatingText: damageString,
			floatingTextColor: Themes.secondary2,
			combatLogText: `Inflicts ${damageString} Damage to ${props.target.name}!`,
		},
	];
}

export function applyHealEffect(
	props: EffectFunctionProps,
): EffectFeedbackDetails[] {
	const targetLifeAttribute = props.target.attributes.life;
	const healing = props.effectVariables["healing"] as number;

	const healingContext = {
		effect: "healing",
		healing,
	};

	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorEffectTaken,
		healingContext,
	);

	targetLifeAttribute.currentValue = clamp(
		targetLifeAttribute.currentValue + healingContext.healing,
		0,
		targetLifeAttribute.maximumValue,
	);

	const healingString = healing.toString();
	return [
		{
			floatingText: healingString,
			floatingTextColor: Themes.success,
			combatLogText: `Restores ${healingString} Life to ${props.target.name}.`,
		},
	];
}

export function applyStatusEffect(
	props: EffectFunctionProps,
): EffectFeedbackDetails[] {
	const statusId = props.effectVariables["statusId"] as string;
	return [
		{
			floatingText: statusId,
			floatingTextColor: Themes.success,
			combatLogText: `Inflicts ${statusId} to ${props.target.name}.`,
		},
	];
}

export function applyCriticalEffect(
	props: EffectFunctionProps,
): EffectFeedbackDetails[] {
	const criticalAttribute = props.source.attributes.critical;
	const criticalEffects = props.effectVariables["effects"] as EffectData[];
	const criticalRoll = RandomRange(1, 100) / 100;
	if (criticalRoll <= criticalAttribute.currentValue) {
		const criticalEffectFeedbackDetails: EffectFeedbackDetails[] = [];
		criticalEffects.forEach((effectData) => {
			const effectProcessor =
				getAbilityEffectProcessor().getProcessorFunction(effectData.id);
			const effectFeedbackDetails = effectProcessor({
				source: props.source,
				target: props.target,
				descriptors: props.descriptors,
				effectVariables: {
					...effectData.variables,
				},
			});
			criticalEffectFeedbackDetails.push(...effectFeedbackDetails);
		});
		return criticalEffectFeedbackDetails;
	}
	return [];
}
