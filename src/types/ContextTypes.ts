import { EffectData } from "src/components/ActorStateComponent";

export interface AbilityContext {
	target: string;
	descriptors: string[];
	effects: EffectData[];
	actionContext?: ActionContext;
	damageContext?: DamageContext;
	healingContext?: HealingContext;
	statusEffectContext?: StatusEffectContext;
	criticalHitContext?: CriticalHitContext;
}

export interface ActionContext {
	cost: number;
	costAttribute: string;
	recoveryTime: number;
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

export interface CriticalHitContext {
	onCriticalHitEffects: EffectData[];
}
