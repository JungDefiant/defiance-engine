export type AbilityEffectType = "damage" | "healing" | "status" | "critical";

export interface EffectFeedbackDetails {
	sourceName: string;
	targetName: string;
	criticalHits: number;
	totalDamage: number;
	totalHealing: number;
	statusEffects: Set<string>;
}
