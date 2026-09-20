import type { AbilityEffectType } from "./AbilityTypes";
import { Themes } from "src/gui/Themes";
import { EffectFeedbackContext } from "./ContextTypes";

export type EffectFeedbackType = "attackRoll" | "damage" | "healing" | "surge";

export interface ActorGUI {
	setActBarFill(currValue: number, maxValue: number): void;
	addStatusIcon(id: string, iconSrc: string): void;
	removeStatusIcon(id: string): void;
}

export interface EffectFeedbackStyle {
	floatingTextColor: string;
	floatingText: (context: EffectFeedbackContext) => string;
	combatLogText: (context: EffectFeedbackContext) => string;
}

export const EffectFeedbackStyles = new Map<
	EffectFeedbackType,
	EffectFeedbackStyle
>([
	[
		"attackRoll",
		{
			floatingTextColor: Themes.secondary2,
			floatingText: (context: EffectFeedbackContext) => {
				const attackContext = context.abilityContext.attackContext;
				if (
					!attackContext ||
					attackContext.attackRollResult === "hit"
				) {
					return "";
				}

				return `${attackContext.attackRollResult.toUpperCase()}!`;
			},
			combatLogText: (context: EffectFeedbackContext) => {
				const attackContext = context.abilityContext.attackContext;
				if (
					!attackContext ||
					attackContext.attackRollResult === "hit"
				) {
					return "";
				}

				const attackRollResultFeedback = `${String(attackContext.attackRollResult).charAt(0).toUpperCase()}${String(attackContext.attackRollResult).slice(1)}`;
				return `inflicts a ${attackRollResultFeedback}!`;
			},
		},
	],
	[
		"damage",
		{
			floatingTextColor: Themes.neutral2,
			floatingText: (context: EffectFeedbackContext) => {
				const damageContext = context.abilityContext.damageContext;
				if (!damageContext) {
					return "";
				}
				return `${damageContext.totalDamage}`;
			},
			combatLogText: (context) => {
				const damageContext = context.abilityContext.damageContext;
				if (!damageContext) {
					return "";
				}
				return `inflicts ${damageContext.totalDamage} damage to ${context.targetName}.`;
			},
		},
	],
	[
		"healing",
		{
			floatingTextColor: Themes.success,
			floatingText: (context: EffectFeedbackContext) => {
				const healingContext = context.abilityContext.healingContext;
				if (!healingContext) {
					return "";
				}
				return `${healingContext.baseHealing}`;
			},
			combatLogText: (context) => {
				const healingContext = context.abilityContext.healingContext;
				if (!healingContext) {
					return "";
				}
				return `restores ${healingContext.baseHealing} Life Points to ${context.targetName}.`;
			},
		},
	],
	[
		"surge",
		{
			floatingTextColor: Themes.secondary3,
			floatingText: (context: EffectFeedbackContext) => {
				return `SURGE`;
			},
			combatLogText: (context) => {
				return `gains the Surge status.`;
			},
		},
	],
]);
