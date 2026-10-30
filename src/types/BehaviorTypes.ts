import { AbilityDescriptor, ActionSlotKey } from "./AbilityTypes";

export enum DefaultBehavior {
	Passive = "Passive",
	Aggressive = "Aggressive",
	Defensive = "Defensive",
}

export enum TacticCondition {
	random = "random",
	lowestLife = "lowestLife",
	selfLifeBelowHalf = "selfLifeBelowHalf",
	allyLifeBelowHalf = "allyLifeBelowHalf",
	enemyInMeleeRange = "enemyInMeleeRange",
}

export interface ActorTactic {
	condition: TacticCondition;
	actionType: AbilityDescriptor;
	actionSlotKey: ActionSlotKey;
	actionIndex: number;
	conditionValue?: number;
}

export function createDefaultActorTactics(): ActorTactic[] {
	return [
		{
			condition: TacticCondition.random,
			actionType: "weapon" as AbilityDescriptor,
			actionSlotKey: ActionSlotKey.weapon,
			actionIndex: 0,
		},
	];
}
