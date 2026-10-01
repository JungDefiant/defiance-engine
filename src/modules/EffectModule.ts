import ActorStateComponent from "src/components/ActorStateComponent";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectFunctionProps,
	EffectVariable,
} from "src/types/AbilityTypes";
import {
	getAbilityEffectCalculationProcessor,
	getAbilityEffectApplicationProcessor,
} from "./ProcessorModule";
import {
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
import { clamp } from "./Utils";
import { defeatActor } from "./CombatModule";
import { RandomRange } from "babylonjs";

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

export function calculateAbilityEffects(props: EffectFunctionProps) {
	const abilityEffects = props.abilityContext.effects;

	const abilityEffectCalculationProcessor =
		getAbilityEffectCalculationProcessor();

	abilityEffects.forEach((effect) => {
		const effectProcessor =
			abilityEffectCalculationProcessor.getProcessorFunction(effect.id);
		effectProcessor(props, effect.variables);
	});
}

export function applyAbilityEffects(props: EffectFunctionProps) {
	const abilityEffects = props.abilityContext.effects;
	const abilityEffectProcessor = getAbilityEffectApplicationProcessor();

	abilityEffects.forEach((effect) => {
		const effectProcessor = abilityEffectProcessor.getProcessorFunction(
			effect.id,
		);
		effectProcessor(props);
	});
}

export function performAttackRoll(props: EffectFunctionProps) {
	const sourceTotalOffense = calculateTotalAttributeValue(
		props.source.attributes.offense,
		props.abilityContext.descriptors,
	);

	const sourceTotalDefense = calculateTotalAttributeValue(
		props.target.attributes.defense,
		props.abilityContext.descriptors,
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
	props.abilityContext.abilityTargetContexts[
		props.abilityTargetIndex
	].attackContext = attackContext;

	triggerFeatEffects(
		{
			target: props.target,
			source: props.source,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		},
		abilityTrigger,
	);
}

export function spendAbilityCost(
	source: ActorStateComponent,
	actionData: AbilityData,
): boolean {
	const abilityCost = (actionData.cost as number) || 0;
	const costAttributeName = (actionData.costAttribute as string) || "";
	const costAttribute = source.attributes[costAttributeName];
	const isToggle = actionData.descriptors.includes(AbilityDescriptor.toggle);

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
	props: EffectFunctionProps,
	trigger: AbilityTrigger,
) {
	const triggeredFeats = props.source.featData.filter(
		(x) => x.trigger === trigger,
	);
	triggeredFeats.forEach((feat) => {
		const abilityContext = { ...props.abilityContext };
		abilityContext.target = `${feat.target}`;
		abilityContext.descriptors = feat.descriptors;
		abilityContext.effects = feat.effectData;
		applyAbilityEffects({
			source: props.source,
			target: props.target,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		});
	});
}

export function endToggles(sourceState: ActorStateComponent) {}

export function calculateDamageEffect(
	props: EffectFunctionProps,
	effectVariables: { [index: string]: EffectVariable },
) {
	const abilityTargetContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex];
	let damageContext = abilityTargetContext.damageContext;
	if (!damageContext) {
		const baseDamage = effectVariables.baseDamage || 0;
		damageContext = {
			baseDamage,
			totalDamage: 0,
			damageMultiplier: 1,
			targetResist: 1,
		} as DamageContext;
		abilityTargetContext.damageContext = damageContext;
	}

	damageContext.targetResist = calculateTotalAttributeValue(
		props.target.attributes.resist,
		props.abilityContext.descriptors,
	);

	triggerFeatEffects(
		{
			target: props.target,
			source: props.source,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		},
		AbilityTrigger.onActorInflictDamage,
	);

	triggerFeatEffects(
		{
			target: props.target,
			source: props.source,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		},
		AbilityTrigger.onActorResistEffect,
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

export function applyDamageEffect(props: EffectFunctionProps) {
	const abilityTargetContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex];
	const damageContext = abilityTargetContext.damageContext;
	if (!damageContext) {
		return;
	}

	const attackContext = abilityTargetContext.attackContext;
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
		{
			target: props.target,
			source: props.source,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		},
		AbilityTrigger.onActorLifeModify,
	);

	if (targetLifeAttribute.currentValue === 0) {
		defeatActor(props.target);
	}
}

export function calculateHealEffect(
	props: EffectFunctionProps,
	effectVariables: { [index: string]: EffectVariable },
) {
	const abilityTargetContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex];
	let healingContext = abilityTargetContext.healingContext;
	if (!healingContext) {
		const baseHealing = effectVariables.baseHealing || 0;
		healingContext = {
			baseHealing,
		} as HealingContext;
		abilityTargetContext.healingContext = healingContext;
	}

	triggerFeatEffects(
		{
			target: props.target,
			source: props.source,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		},
		AbilityTrigger.onActorGrantHealing,
	);
}

export function applyHealEffect(props: EffectFunctionProps) {
	const abilityTargetContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex];
	const healingContext = abilityTargetContext.healingContext;
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
		{
			target: props.target,
			source: props.source,
			abilityContext: props.abilityContext,
			abilityTargetIndex: props.abilityTargetIndex,
		},
		AbilityTrigger.onActorLifeModify,
	);
}

export function calculateStatusEffect(
	props: EffectFunctionProps,
	effectVariables: { [index: string]: EffectVariable },
) {
	const abilityTargetContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex];
	let statusEffectContexts = abilityTargetContext.statusEffectContexts;
	if (!statusEffectContexts) {
		statusEffectContexts = new Map<string, StatusEffectContext>();
		abilityTargetContext.statusEffectContexts = statusEffectContexts;
	}

	const newStatusEffectContext = {
		statusId: effectVariables.statusId,
		duration: effectVariables.duration,
	} as StatusEffectContext;
	statusEffectContexts.set(
		newStatusEffectContext.statusId,
		newStatusEffectContext,
	);
}

export function applyStatusEffect(props: EffectFunctionProps) {
	const abilityTargetContext =
		props.abilityContext.abilityTargetContexts[props.abilityTargetIndex];
	const statusEffectContexts = abilityTargetContext.statusEffectContexts;
	if (!statusEffectContexts) {
		return;
	}
}

export function calculateAttributeModifier(
	props: EffectFunctionProps,
	effectVariables: { [index: string]: EffectVariable },
) {
	const descriptors =
		(effectVariables.descriptors as AbilityDescriptor[]) || [];
	const attributeName = (effectVariables.attributeName as string) || "";
	const amount = (effectVariables.amount as number) || 0;
	const duration = (effectVariables.duration as number) || 0;

	props.target.attributes[attributeName].modifiers.push({
		descriptors,
		amount,
	} as ActorAttributeModifier);
}

export function calculateContextVariableModifier(
	props: EffectFunctionProps,
	effectVariables: { [index: string]: EffectVariable },
) {
	const abilityContext = props.abilityContext;
	const requiredDescriptors =
		(effectVariables.requiredDescriptors as AbilityDescriptor[]) || [];
	const contextObjectName =
		(effectVariables.contextObjectName as string) || "";
	const contextVariableName =
		(effectVariables.contextVariableName as string) || "";
	const variableModifier = (effectVariables.variableModifier as number) || 0;

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
