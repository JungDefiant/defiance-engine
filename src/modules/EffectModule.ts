import ActorStateComponent from "src/components/ActorStateComponent";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectVariable,
} from "src/types/AbilityTypes";
import { clamp } from "./Utils";
import { defeatActor } from "./CombatModule";
import {
	getAbilityEffectCalculationProcessor,
	getAbilityEffectApplicationProcessor,
} from "./ProcessorModule";
import {
	AbilityTargetContext,
	AttackContext,
	DamageContext,
	HealingContext,
	StatusEffectContext,
} from "src/types/ContextTypes";
import {
	ActorAttribute,
	ActorAttributeModifier,
} from "src/types/AttributeTypes";
import {
	BASE_CRITCHANCE,
	BASE_GRAZECHANCE,
	BASE_HITCHANCE,
	MAX_ATTACKRESULTCHANCE,
	MIN_ATTACKRESULTCHANCE,
} from "src/constants/CombatConstants";
import { RandomRange } from "babylonjs";

export interface EffectCalculationFunctionProps {
	source: ActorStateComponent;
	target: ActorStateComponent;
	abilityContext: AbilityTargetContext;
	effectVariables: { [index: string]: EffectVariable };
}

export interface EffectApplicationFunctionProps {
	source: ActorStateComponent;
	target: ActorStateComponent;
	abilityContext: AbilityTargetContext;
}

export function calculateTotalAttributeValue(
	attribute: ActorAttribute,
	descriptors: AbilityDescriptor[],
): number {
	const modifiers = attribute.modifiers.filter((modifier) => {
		for (const descriptor of modifier.descriptors) {
			if (!descriptors.includes(descriptor)) {
				return false;
			}
		}

		return true;
	});

	let attributeCurrentValue = attribute.currentValue;
	for (const modifier of modifiers) {
		attributeCurrentValue += modifier.amount;
	}

	return attributeCurrentValue;
}

export function calculateAbilityEffects(
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	abilityData: AbilityData,
	context: AbilityTargetContext,
) {
	const abilityEffects = abilityData.effectData;
	context.effects = abilityEffects;

	const abilityEffectCalculationProcessor =
		getAbilityEffectCalculationProcessor();

	abilityEffects.forEach((effect) => {
		const effectProcessor =
			abilityEffectCalculationProcessor.getProcessorFunction(effect.id);
		effectProcessor({
			source: sourceState,
			target: targetState,
			abilityContext: context,
			effectVariables: effect.variables,
		});
	});
}

export function applyAbilityEffects(
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	abilityData: AbilityData,
	context: AbilityTargetContext,
) {
	const abilityEffects = abilityData.effectData;
	context.effects = abilityEffects;
	const abilityEffectProcessor = getAbilityEffectApplicationProcessor();

	abilityEffects.forEach((effect) => {
		const effectProcessor = abilityEffectProcessor.getProcessorFunction(
			effect.id,
		);
		effectProcessor({
			source: sourceState,
			target: targetState,
			abilityContext: context,
		});
	});
}

export function performAttackRoll(
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	context: AbilityTargetContext,
) {
	const sourceTotalOffense = calculateTotalAttributeValue(
		sourceState.attributes.offense,
		context.descriptors,
	);

	const sourceTotalDefense = calculateTotalAttributeValue(
		targetState.attributes.defense,
		context.descriptors,
	);

	let hitChance = BASE_HITCHANCE;
	let grazeChance = Math.min(
		BASE_GRAZECHANCE + (sourceTotalDefense - sourceTotalOffense),
		MAX_ATTACKRESULTCHANCE,
	);
	let critChance = Math.min(
		BASE_CRITCHANCE + (sourceTotalOffense - sourceTotalDefense),
		MAX_ATTACKRESULTCHANCE,
	);

	if (grazeChance < MIN_ATTACKRESULTCHANCE) {
		const grazeMinDifference = MIN_ATTACKRESULTCHANCE - grazeChance;
		hitChance = Math.max(hitChance - grazeMinDifference, 0);
		grazeChance = MIN_ATTACKRESULTCHANCE;
	}

	if (critChance < MIN_ATTACKRESULTCHANCE) {
		const critMinDifference = MIN_ATTACKRESULTCHANCE - critChance;
		hitChance = Math.max(hitChance - critMinDifference, 0);
		critChance = MIN_ATTACKRESULTCHANCE;
	}

	const attackRoll = Math.round(RandomRange(1, 100));
	let attackRollResult = "hit";
	let abilityTrigger = AbilityTrigger.onActorAttackHit;
	if (attackRoll <= grazeChance) {
		attackRollResult = "graze";
		abilityTrigger = AbilityTrigger.onActorAttackGraze;
	} else if (attackRoll > grazeChance + hitChance) {
		attackRollResult = "crit";
		abilityTrigger = AbilityTrigger.onActorAttackCrit;
	}

	const attackContext = {
		attackRoll,
		attackRollResult,
	} as AttackContext;
	context.attackContext = attackContext;

	triggerFeatEffects(sourceState, targetState, abilityTrigger, context);
}

export function spendAbilityCost(
	source: ActorStateComponent,
	context: AbilityTargetContext,
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
	} else {
		costAttribute.currentValue = Math.max(
			costAttribute.currentValue - abilityCost,
			0,
		);
	}
	return true;
}

export function triggerFeatEffects(
	sourceState: ActorStateComponent,
	targetState: ActorStateComponent,
	trigger: AbilityTrigger,
	context: AbilityTargetContext,
) {
	const triggeredFeats = sourceState.featData.filter(
		(x) => x.trigger === trigger,
	);
	triggeredFeats.forEach((feat) => {
		const abilityContext = { ...context };
		abilityContext.target = `${feat.target}`;
		abilityContext.descriptors = feat.descriptors;
		abilityContext.effects = feat.effectData;
		applyAbilityEffects(sourceState, targetState, feat, context);
	});
}

export function endToggles(sourceState: ActorStateComponent) {}

export function calculateDamageEffect(props: EffectCalculationFunctionProps) {
	const abilityContext = props.abilityContext;
	let damageContext = abilityContext.damageContext;
	if (!damageContext) {
		const baseDamage = props.effectVariables.baseDamage || 0;
		damageContext = {
			baseDamage,
			totalDamage: 0,
			damageMultiplier: 1,
			targetResist: 1,
		} as DamageContext;
		abilityContext.damageContext = damageContext;
	}

	damageContext.targetResist = calculateTotalAttributeValue(
		props.target.attributes.resist,
		abilityContext.descriptors,
	);

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

	let resistMultiplier = 1;
	if (damageContext.targetResist >= 0) {
		resistMultiplier = 1 + damageContext.targetResist;
	} else {
		resistMultiplier = 1 / (1 + Math.abs(damageContext.targetResist));
	}

	damageContext.totalDamage += Math.max(
		Math.floor(damageContext.baseDamage * resistMultiplier),
		0,
	);
}

export function applyDamageEffect(props: EffectApplicationFunctionProps) {
	const abilityContext = props.abilityContext;
	const damageContext = abilityContext.damageContext;
	if (!damageContext) {
		return;
	}

	const attackContext = abilityContext.attackContext;
	if (attackContext) {
		const attackRollResult = attackContext.attackRollResult;
		if (attackRollResult === "graze") {
			damageContext.totalDamage *= 0.5;
		} else if (attackRollResult === "crit") {
			damageContext.totalDamage *= 2;
		}
	}

	const targetLifeAttribute = props.target.attributes.lifePoints;

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
}

export function calculateHealEffect(props: EffectCalculationFunctionProps) {
	const abilityContext = props.abilityContext;
	let healingContext = abilityContext.healingContext;
	if (!healingContext) {
		const baseHealing = props.effectVariables.baseHealing || 0;
		healingContext = {
			baseHealing,
		} as HealingContext;
		abilityContext.healingContext = healingContext;
	}

	triggerFeatEffects(
		props.source,
		props.target,
		AbilityTrigger.onActorGrantHealing,
		abilityContext,
	);
}

export function applyHealEffect(props: EffectApplicationFunctionProps) {
	const abilityContext = props.abilityContext;
	const healingContext = abilityContext.healingContext;
	if (!healingContext) {
		return;
	}

	const targetLifeAttribute = props.target.attributes.lifePoints;

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
}

export function calculateStatusEffect(props: EffectCalculationFunctionProps) {
	const abilityContext = props.abilityContext;
	let statusEffectContexts = abilityContext.statusEffectContexts;
	if (!statusEffectContexts) {
		statusEffectContexts = new Map<string, StatusEffectContext>();
		abilityContext.statusEffectContexts = statusEffectContexts;
	}

	const newStatusEffectContext = {
		statusId: props.effectVariables.statusId,
		duration: props.effectVariables.duration,
	} as StatusEffectContext;
	statusEffectContexts.set(
		newStatusEffectContext.statusId,
		newStatusEffectContext,
	);
}

export function applyStatusEffect(props: EffectApplicationFunctionProps) {
	const abilityContext = props.abilityContext;
	const statusEffectContexts = abilityContext.statusEffectContexts;
	if (!statusEffectContexts) {
		return;
	}
}

export function calculateAttributeModifier(
	props: EffectCalculationFunctionProps,
) {
	const descriptors =
		(props.effectVariables.descriptors as AbilityDescriptor[]) || [];
	const attributeName = (props.effectVariables.attributeName as string) || "";
	const amount = (props.effectVariables.amount as number) || 0;
	const duration = (props.effectVariables.duration as number) || 0;

	props.target.attributes[attributeName].modifiers.push({
		descriptors,
		amount,
	} as ActorAttributeModifier);
}

export function calculateContextVariableModifier(
	props: EffectCalculationFunctionProps,
) {
	const abilityContext = props.abilityContext;
	const requiredDescriptors =
		(props.effectVariables.requiredDescriptors as AbilityDescriptor[]) ||
		[];
	const contextObjectName =
		(props.effectVariables.contextObjectName as string) || "";
	const contextVariableName =
		(props.effectVariables.contextVariableName as string) || "";
	const variableModifier =
		(props.effectVariables.variableModifier as number) || 0;

	for (const requiredDescriptor of requiredDescriptors) {
		if (!abilityContext.descriptors.includes(requiredDescriptor)) {
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
