import { EntityId } from "bitecs";
import { AbilityDescriptor, EffectData } from "./AbilityTypes";

export type AttackRollResult = "hit" | "crit" | "graze";

export interface AbilityTargetContext {
	abilityName: string;
	target: string;
	descriptors: AbilityDescriptor[];
	effects: EffectData[];
	actionContext?: ActionContext;
	attackContext?: AttackContext;
	damageContext?: DamageContext;
	healingContext?: HealingContext;
	statusEffectContexts?: Map<string, StatusEffectContext>;
}

export interface EffectFeedbackContext {
	abilityName: string;
	sourceName: string;
	targetName: string;
	targetEntityId: EntityId;
	abilityContext: AbilityTargetContext;
}

export interface ActionContext {
	cost: number;
	costAttribute: string;
	recoveryTime: number;
}

export interface AttackContext {
	attackRoll: number;
	attackRollResult: AttackRollResult;
	// attackRollChances: Map<AttackRollResult, number>;
}

export interface DamageContext {
	baseDamage: number;
	totalDamage: number;
	damageMultiplier: number;
	targetResist: number;
}

export interface HealingContext {
	baseHealing: number;
}

export interface StatusEffectContext {
	statusId: string;
	duration: number;
}
