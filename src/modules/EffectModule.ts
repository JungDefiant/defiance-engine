import { RandomRange } from "@babylonjs/core";
import ActorStateComponent, {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectData,
	EffectVariable,
} from "src/components/ActorStateComponent";
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
import UserInterfaceState from "src/states/UserInterfaceState";
import {
	AbilityContext,
	CriticalHitContext,
	DamageContext,
	HealingContext,
} from "src/types/ContextTypes";

export interface EffectFunctionProps {
	source: ActorStateComponent;
	target: ActorStateComponent;
	abilityContext: AbilityContext;
	effectVariables: { [index: string]: EffectVariable };
	effectFeedbackDetails: EffectFeedbackDetails;
}

export function processAbilityEffects(
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	abilityData: AbilityData,
	context: AbilityContext,
) {
	const userInterfaceState = getUserInterfaceState();

	const effectFeedbackDetails: EffectFeedbackDetails = {
		sourceName: sourceState.name,
		targetName: targetState.name,
		criticalHits: 0,
		totalDamage: 0,
		totalHealing: 0,
		statusEffects: new Set<string>(),
	};

	const abilityEffects = abilityData.effectData;
	context.effects = abilityEffects;

	const abilityEffectProcessor = getAbilityEffectProcessor();

	abilityEffects.forEach((effect) => {
		const effectProcessor = abilityEffectProcessor.getProcessorFunction(
			effect.id,
		);
		effectProcessor({
			source: sourceState,
			target: targetState,
			abilityContext: context,
			effectVariables: effect.variables,
			effectFeedbackDetails,
		});
	});

	if (effectFeedbackDetails.criticalHits > 0) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"critical",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			targetData: targetState,
			effectFeedbackStyle,
			effectFeedbackDetails,
			userInterfaceState,
			sourceData: sourceState,
			abilityData,
		});
	}

	if (effectFeedbackDetails.totalDamage > 0) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"damage",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			targetData: targetState,
			effectFeedbackStyle,
			effectFeedbackDetails,
			userInterfaceState,
			sourceData: sourceState,
			abilityData,
		});
	}

	if (effectFeedbackDetails.totalHealing > 0) {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			"healing",
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			targetData: targetState,
			effectFeedbackStyle,
			effectFeedbackDetails,
			userInterfaceState,
			sourceData: sourceState,
			abilityData,
		});
	}

	effectFeedbackDetails.statusEffects.forEach((statusEffect) => {
		const effectFeedbackStyle = EffectFeedbackStyles.get(
			statusEffect,
		) as EffectFeedbackStyle;
		addEffectFeedbackRenderQueueEntries({
			targetData: targetState,
			effectFeedbackStyle,
			effectFeedbackDetails,
			userInterfaceState,
			sourceData: sourceState,
			abilityData,
		});
	});
}

export function spendAbilityCost(
	source: ActorStateComponent,
	context: AbilityContext,
): boolean {
	const actionContext = context.actionContext;
	if (!actionContext) {
		return false;
	}

	const abilityCost = (actionContext.cost as number) || 0;
	const costAttributeName = (actionContext.costAttribute as string) || "";
	const costAttribute = source.attributes[costAttributeName];
	const isToggle = context.descriptors.includes(AbilityDescriptor.toggle);

	if (!costAttribute || costAttribute.currentValue < abilityCost) {
		return false;
	}

	if (isToggle && costAttributeName === "willPoints") {
		source.attributes.willCostPerSecond.currentValue += abilityCost;
		return true;
	} else {
		costAttribute.currentValue = Math.max(
			costAttribute.currentValue - abilityCost,
			0,
		);
		return true;
	}
}

interface EffectFeedbackRenderQueueEntriesProps {
	targetData: ActorStateComponent;
	effectFeedbackStyle: EffectFeedbackStyle;
	effectFeedbackDetails: EffectFeedbackDetails;
	userInterfaceState: UserInterfaceState;
	sourceData: ActorStateComponent;
	abilityData: AbilityData;
}

function addEffectFeedbackRenderQueueEntries(
	props: EffectFeedbackRenderQueueEntriesProps,
) {
	addFloatingTextRQE(
		props.targetData.entityId,
		props.effectFeedbackStyle.floatingText(props.effectFeedbackDetails),
		props.effectFeedbackStyle.floatingTextColor,
	);
	props.userInterfaceState.combatHud.addCombatLogEntry(
		`${props.sourceData.name} (${props.abilityData.name})`,
		props.effectFeedbackStyle.combatLogText(props.effectFeedbackDetails),
	);
}

export function triggerFeatEffects(
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	trigger: AbilityTrigger,
	context: AbilityContext,
) {
	const triggeredFeats = sourceState.featData.filter(
		(x) => x.trigger === trigger,
	);
	triggeredFeats.forEach((feat) => {
		const abilityContext = { ...context };
		abilityContext.target = `${feat.target}`;
		abilityContext.descriptors = feat.descriptors;
		abilityContext.effects = feat.effectData;
		console.log("ABILITY CONTEXT", abilityContext);
		processAbilityEffects(sourceState, targetState, feat, context);
	});
}

export function endToggles(sourceState: ActorStateComponent) {}

export function applyDamageEffect(props: EffectFunctionProps) {
	const abilityContext = props.abilityContext;
	let damageContext = abilityContext.damageContext;
	if (!damageContext) {
		const baseDamage = props.effectVariables["baseDamage"] || 0;
		damageContext = {
			baseDamage,
			totalDamage: 0,
			damageMultiplier: 1,
			targetResist: 1,
		} as DamageContext;
		abilityContext.damageContext = damageContext;
	}

	const targetLifeAttribute = props.target.attributes.lifePoints;
	damageContext.targetResist = props.target.attributes.resist.currentValue;

	triggerFeatEffects(
		props.target,
		props.source,
		AbilityTrigger.onActorResistEffect,
		abilityContext,
	);

	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorInflictDamage,
		abilityContext,
	);

	if (damageContext.targetResist >= 0) {
		damageContext.damageMultiplier =
			damageContext.damageMultiplier * (1 + damageContext.targetResist);
	} else {
		damageContext.damageMultiplier =
			damageContext.damageMultiplier *
			(1 / (1 + Math.abs(damageContext.targetResist)));
	}

	damageContext.totalDamage = Math.max(
		Math.floor(damageContext.baseDamage * damageContext.damageMultiplier),
		1,
	);

	targetLifeAttribute.currentValue = clamp(
		targetLifeAttribute.currentValue - damageContext.totalDamage,
		0,
		targetLifeAttribute.maximumValue,
	);

	triggerFeatEffects(
		props.target,
		props.source,
		AbilityTrigger.onActorLifeModify,
		abilityContext,
	);

	if (targetLifeAttribute.currentValue === 0) {
		defeatActor(props.target);
	}

	props.effectFeedbackDetails.totalDamage += damageContext.totalDamage;
}

export function applyHealEffect(props: EffectFunctionProps) {
	const abilityContext = props.abilityContext;
	let healingContext = abilityContext.healingContext;
	if (!healingContext) {
		const baseHealing = props.effectVariables["baseHealing"] || 0;
		healingContext = {
			baseHealing,
		} as HealingContext;
		abilityContext.healingContext = healingContext;
	}

	const targetLifeAttribute = props.target.attributes.lifePoints;

	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorGrantHealing,
		abilityContext,
	);

	targetLifeAttribute.currentValue = clamp(
		targetLifeAttribute.currentValue + healingContext.baseHealing,
		0,
		targetLifeAttribute.maximumValue,
	);

	triggerFeatEffects(
		props.target,
		props.source,
		AbilityTrigger.onActorLifeModify,
		abilityContext,
	);

	props.effectFeedbackDetails.totalHealing += healingContext.baseHealing;
}

export function applyStatusEffect(props: EffectFunctionProps) {
	const abilityContext = props.abilityContext;
	const statusEffectContext = abilityContext.statusEffectContext;
	if (!statusEffectContext) {
		return;
	}
	props.effectFeedbackDetails.statusEffects.add(statusEffectContext.statusId);
}

export function applyCriticalEffect(props: EffectFunctionProps) {
	const abilityContext = props.abilityContext;
	let criticalHitContext = abilityContext.criticalHitContext;
	if (!criticalHitContext) {
		const onCriticalHitEffects =
			props.effectVariables["onCriticalHitEffects"] || [];
		criticalHitContext = {
			onCriticalHitEffects,
		} as CriticalHitContext;
		abilityContext.criticalHitContext = criticalHitContext;
	}

	const criticalAttribute = props.source.attributes.critical;
	const criticalEffects = criticalHitContext.onCriticalHitEffects;
	const criticalEffectContext = {
		effect: "critical",
		criticalRating: criticalAttribute.currentValue,
		criticalEffects,
	};
	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorRollCriticalHit,
		abilityContext,
	);

	const criticalRoll = Math.round(RandomRange(1, 100)) / 100;

	if (criticalRoll <= criticalEffectContext.criticalRating) {
		triggerFeatEffects(
			props.source,
			props.target,
			AbilityTrigger.onActorScoreCriticalHit,
			abilityContext,
		);
		criticalEffectContext.criticalEffects.forEach((effectData) => {
			const effectProcessor =
				getAbilityEffectProcessor().getProcessorFunction(effectData.id);
			effectProcessor({
				source: props.source,
				target: props.target,
				abilityContext,
				effectVariables: effectData.variables,
				effectFeedbackDetails: props.effectFeedbackDetails,
			});
		});
		props.effectFeedbackDetails.criticalHits += 1;
	}
}

export function applyModifyContextVariable(props: EffectFunctionProps) {
	const abilityContext = props.abilityContext;
	const requiredDescriptors =
		(props.effectVariables.requiredDescriptors as string[]) || [];
	const contextObjectName =
		(props.effectVariables.contextObjectName as string) || "";
	const contextVariableName =
		(props.effectVariables.contextVariableName as string) || "";
	const variableModifier =
		(props.effectVariables.variableModifier as number) || 0;

	for (let i = 0; i < requiredDescriptors.length; i++) {
		if (!abilityContext.descriptors.includes(requiredDescriptors[i])) {
			return;
		}
	}

	const contextObject = (Object.entries(abilityContext).find(
		(x) => x[0] === contextObjectName,
	) || ["", null])[1];
	if (!contextObject || !contextObject[contextVariableName]) {
		return;
	}

	contextObject[contextVariableName] += variableModifier;
}
