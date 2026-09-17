import { RandomRange } from "@babylonjs/core";
import ActorStateComponent, {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectData,
	EffectVariable,
} from "src/components/ActorStateComponent";
import { Themes } from "src/gui/Themes";
import { EffectFeedbackDetails } from "src/types/AbilityTypes";
import { clamp } from "./Utils";
import { addFloatingTextRQE } from "./RenderModule";
import { defeatActor } from "./CombatModule";
import { getUserInterfaceState } from "./GameStateModule";
import { getAbilityEffectProcessor } from "./ProcessorModule";
import {
	EffectFeedbackStyle,
	EffectFeedbackStyles,
} from "src/types/UserInterfaceTypes";

export interface EffectFunctionProps {
	source: ActorStateComponent;
	target: ActorStateComponent;
	descriptors: AbilityDescriptor[];
	effectVariables: { [index: string]: EffectVariable };
	effectFeedbackDetails: EffectFeedbackDetails;
}

export function processAbilityEffects(
	sourceData: ActorStateComponent,
	targetData: ActorStateComponent,
	abilityData: AbilityData,
	context?: { [index: string]: EffectVariable },
) {
	const effectFeedbackDetails: EffectFeedbackDetails = {
		sourceName: sourceData.name,
		targetName: targetData.name,
		criticalHits: 0,
		totalDamage: 0,
		totalHealing: 0,
		statusEffects: new Set<string>(),
	};
	const userInterfaceState = getUserInterfaceState();
	abilityData.effectData.forEach((effectData) => {
		const effectProcessor =
			getAbilityEffectProcessor().getProcessorFunction(effectData.id);
		effectProcessor({
			source: sourceData,
			target: targetData,
			descriptors: abilityData.descriptors,
			effectVariables: {
				...effectData.variables,
				...context,
			},
			effectFeedbackDetails,
		});
	});

	if (effectFeedbackDetails.criticalHits > 0) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"critical",
		) as EffectFeedbackStyle;
		addFloatingTextRQE(
			targetData.entityId,
			effectFeedbackStyle.floatingText(effectFeedbackDetails),
			effectFeedbackStyle.floatingTextColor,
		);
		userInterfaceState.combatHud.addCombatLogEntry(
			`${sourceData.name} (${abilityData.name})`,
			effectFeedbackStyle.combatLogText(effectFeedbackDetails),
		);
	}

	if (effectFeedbackDetails.totalDamage > 0) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"damage",
		) as EffectFeedbackStyle;
		addFloatingTextRQE(
			targetData.entityId,
			effectFeedbackStyle.floatingText(effectFeedbackDetails),
			effectFeedbackStyle.floatingTextColor,
		);
		userInterfaceState.combatHud.addCombatLogEntry(
			`${sourceData.name} (${abilityData.name})`,
			effectFeedbackStyle.combatLogText(effectFeedbackDetails),
		);
	}

	if (effectFeedbackDetails.totalHealing > 0) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"healing",
		) as EffectFeedbackStyle;
		addFloatingTextRQE(
			targetData.entityId,
			effectFeedbackStyle.floatingText(effectFeedbackDetails),
			effectFeedbackStyle.floatingTextColor,
		);
		userInterfaceState.combatHud.addCombatLogEntry(
			`${sourceData.name} (${abilityData.name})`,
			effectFeedbackStyle.combatLogText(effectFeedbackDetails),
		);
	}

	effectFeedbackDetails.statusEffects.forEach((statusEffect) => {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			statusEffect,
		) as EffectFeedbackStyle;
		addFloatingTextRQE(
			targetData.entityId,
			effectFeedbackStyle.floatingText(effectFeedbackDetails),
			effectFeedbackStyle.floatingTextColor,
		);
		userInterfaceState.combatHud.addCombatLogEntry(
			`${sourceData.name} (${abilityData.name})`,
			effectFeedbackStyle.combatLogText(effectFeedbackDetails),
		);
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

export function applyDamageEffect(props: EffectFunctionProps) {
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

	props.effectFeedbackDetails.totalDamage += totalDamage;
}

export function applyHealEffect(props: EffectFunctionProps) {
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

	props.effectFeedbackDetails.totalHealing += healing;
}

export function applyStatusEffect(props: EffectFunctionProps) {
	const statusId = props.effectVariables["statusId"] as string;
	props.effectFeedbackDetails.statusEffects.add(statusId);
}

export function applyCriticalEffect(props: EffectFunctionProps) {
	const criticalAttribute = props.source.attributes.critical;
	const criticalEffects = props.effectVariables["effects"] as EffectData[];
	const criticalRoll = Math.round(RandomRange(1, 100)) / 100;
	if (criticalRoll <= criticalAttribute.currentValue) {
		criticalEffects.forEach((effectData) => {
			const effectProcessor =
				getAbilityEffectProcessor().getProcessorFunction(effectData.id);
			effectProcessor({
				source: props.source,
				target: props.target,
				descriptors: props.descriptors,
				effectVariables: {
					...effectData.variables,
				},
				effectFeedbackDetails: props.effectFeedbackDetails,
			});
		});
		props.effectFeedbackDetails.criticalHits += 1;
	}
}
