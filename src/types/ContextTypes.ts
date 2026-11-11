import { EntityId } from "bitecs";
import { AbilityDescriptor, EffectData } from "./AbilityTypes";

export type AttackRollResult = "hit" | "crit" | "graze";

export interface AbilityContext {
    abilityName: string;
    target: string;
    descriptors: AbilityDescriptor[];
    effects: EffectData[];
    abilityTargetContexts: AbilityTargetContext[];
    actionContext?: ActionContext;
}

export interface AbilityTargetContext {
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
    abilityContext: AbilityContext;
}

export interface ActionContext {
    cost: number;
    costAttribute: string;
    recovery: number;
}

export interface AttackContext {
    attackRoll: number;
    attackRollResult: AttackRollResult;
}

export interface DamageContext {
    baseDamage: number;
    totalDamage: number;
    damageMultiplier: number;
}

export interface HealingContext {
    baseHealing: number;
}

export interface StatusEffectContext {
    statusId: string;
    duration: number;
}
