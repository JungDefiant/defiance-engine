import type { EffectFeedbackDetails } from "./AbilityTypes";
import { Themes } from "src/gui/Themes";

export interface ActorGUI {
	setActBarFill(currValue: number, maxValue: number): void;
	addStatusIcon(id: string, iconSrc: string): void;
	removeStatusIcon(id: string): void;
}

export interface EffectFeedbackStyle {
	floatingTextColor: string;
	floatingText: (context: EffectFeedbackDetails) => string;
	combatLogText: (context: EffectFeedbackDetails) => string;
}

export const EffectFeedbackStyles = new Map<string, EffectFeedbackStyle>([
	[
		"critical",
		{
			floatingTextColor: Themes.secondary2,
			floatingText: (context: EffectFeedbackDetails) => {
				return `CRIT${context.criticalHits > 1 && ` x${context.criticalHits}`}!`;
			},
			combatLogText: (context) => {
				if (context.criticalHits == 1) {
					return `${context.sourceName} inflicts a critical hit.`;
				} else if (context.criticalHits > 1) {
					return `${context.sourceName} inflicts ${context.criticalHits} critical hits.`;
				}

				return "";
			},
		},
	],
	[
		"damage",
		{
			floatingTextColor: Themes.neutral1,
			floatingText: (context: EffectFeedbackDetails) => {
				return `${context.totalDamage}`;
			},
			combatLogText: (context) => {
				return `${context.sourceName} inflicts ${context.totalDamage} damage to ${context.targetName}.`;
			},
		},
	],
	[
		"healing",
		{
			floatingTextColor: Themes.success,
			floatingText: (context: EffectFeedbackDetails) => {
				return `${context.totalHealing}`;
			},
			combatLogText: (context) => {
				return `${context.sourceName} restores ${context.totalHealing} Life Points to ${context.targetName}.`;
			},
		},
	],
	[
		"surge",
		{
			floatingTextColor: Themes.secondary3,
			floatingText: (context: EffectFeedbackDetails) => {
				return `SURGE`;
			},
			combatLogText: (context) => {
				return `${context.targetName} gains the Surge status.`;
			},
		},
	],
]);
