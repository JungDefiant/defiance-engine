import { RandomRange } from "@babylonjs/core";
import ActorStateComponent, {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectVar,
} from "src/components/ActorStateComponent";
import { Themes } from "src/gui/Themes";
import { container } from "tsyringe";
import { clamp } from "./Utils";
import { addFloatingTextRQE } from "./RenderModule";
import { defeatActor } from "./CombatModule";
import { getUserInterfaceState } from "./GameStateModule";

export const BASE_DEFENSE = 10;

export function processAbilityEffects(
	sourceData: ActorStateComponent,
	targetData: ActorStateComponent,
	abilityData: AbilityData,
	context?: { [index: string]: EffectVar },
) {
	let effectText;
	const userInterfaceState = getUserInterfaceState();
	abilityData.effectData.forEach((eff) => {
		switch (eff.id) {
			case "damage":
				effectText = applyDamageEffect(
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
					effectText,
					Themes.neutral2,
				);
				userInterfaceState.combatHud.addCombatLogEntry(
					`${sourceData.name} (${abilityData.name})`,
					`Inflicts ${effectText} Damage to ${targetData.name}!`,
				);
				break;
			case "healing":
				effectText = applyHealEffect(
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
					effectText,
					Themes.success,
				);
				userInterfaceState.combatHud.addCombatLogEntry(
					`${sourceData.name} (${abilityData.name})`,
					`Restores ${effectText} Life to ${targetData.name}.`,
				);
				break;
			default:
				return;
		}
	});
}

export function triggerFeatEffects(
	sourceData: ActorStateComponent,
	targetData: ActorStateComponent,
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
	source: ActorStateComponent,
	target: ActorStateComponent,
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
	source: ActorStateComponent,
	target: ActorStateComponent,
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
