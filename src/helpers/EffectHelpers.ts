import { RandomRange } from "@babylonjs/core";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	ActorState,
	EffectVar,
} from "src/components/ActorState";
import { Themes } from "src/gui/Themes";
import GameState from "src/states/GameState";
import { container } from "tsyringe";
import { clamp } from "./Utils";
import { addFloatingTextRQE } from "./RenderHelpers";
import { defeatActor } from "./CombatHelpers";

export const BASE_DEFENSE = 10;

export function processAbilityEffects(
	sourceData: ActorState,
	targetData: ActorState,
	abilityData: AbilityData,
	context?: { [index: string]: EffectVar },
) {
	let effText;
	const gs = container.resolve(GameState);
	abilityData.effectData.forEach((eff) => {
		switch (eff.id) {
			case "damage":
				effText = applyDamageEffect(
					sourceData,
					targetData,
					abilityData.descriptors,
					{
						...eff.variables,
						...context,
					},
				);

				addFloatingTextRQE(
					targetData.entityId,
					effText,
					Themes.neutral2,
				);
				gs.combatHud.addCombatLogEntry(
					`${sourceData.name} (${abilityData.name})`,
					`Inflicts ${effText} Damage to ${targetData.name}!`,
				);
				break;
			case "healing":
				effText = applyHealEffect(
					sourceData,
					targetData,
					abilityData.descriptors,
					{
						...eff.variables,
						...context,
					},
				);
				addFloatingTextRQE(
					targetData.entityId,
					effText,
					Themes.success,
				);
				gs.combatHud.addCombatLogEntry(
					`${sourceData.name} (${abilityData.name})`,
					`Restores ${effText} Life to ${targetData.name}.`,
				);
				break;
			default:
				return;
		}
	});
}

export function triggerFeatEffects(
	sourceData: ActorState,
	targetData: ActorState,
	trigger: AbilityTrigger,
	context?: { [index: string]: EffectVar },
) {
	const triggeredFeats = sourceData.featData.filter(
		(x) => x.trigger === trigger,
	);
	triggeredFeats.forEach((feat) => {
		processAbilityEffects(sourceData, targetData, feat, context);
	});
}

export function applyDamageEffect(
	source: ActorState,
	target: ActorState,
	descriptors: AbilityDescriptor[],
	effVars: { [index: string]: EffectVar },
): string {
	const targetLifeAttr = target.attributes.life;
	const targetDefenseAttr = target.attributes.defense;

	const minDamage = effVars["min"] as number;
	const maxDamage = effVars["max"] as number;
	const damageRoll = Math.round(RandomRange(minDamage, maxDamage));

	const damageContext = {
		effect: "damage",
		damage: damageRoll,
		damageMultiplier: 1,
		targetDefense: targetDefenseAttr.currentValue,
	};

	triggerFeatEffects(
		source,
		target,
		AbilityTrigger.onActorEffectInflicted,
		damageContext,
	);

	const totalDamageMultiplier =
		(BASE_DEFENSE / damageContext.targetDefense) *
		damageContext.damageMultiplier;

	const totalDamage = Math.floor(
		damageContext.damage * totalDamageMultiplier,
	);
	targetLifeAttr.currentValue = clamp(
		targetLifeAttr.currentValue - totalDamage,
		0,
		targetLifeAttr.maximumValue,
	);

	const damageTakenContext = {
		effect: "damage",
		totalDamage,
	};

	triggerFeatEffects(
		source,
		target,
		AbilityTrigger.onActorEffectTaken,
		damageTakenContext,
	);

	if (targetLifeAttr.currentValue === 0) {
		defeatActor(target);
	}

	return totalDamage.toString();
}

export function applyHealEffect(
	source: ActorState,
	target: ActorState,
	descriptors: AbilityDescriptor[],
	effVars: { [index: string]: EffectVar },
): string {
	const targetLifeAttr = target.attributes.life;
	const healing = effVars["healing"] as number;

	const healingContext = {
		effect: "healing",
		healing,
	};

	triggerFeatEffects(
		source,
		target,
		AbilityTrigger.onActorEffectTaken,
		healingContext,
	);

	targetLifeAttr.currentValue = clamp(
		targetLifeAttr.currentValue + healingContext.healing,
		0,
		targetLifeAttr.maximumValue,
	);

	return healing.toString();
}
