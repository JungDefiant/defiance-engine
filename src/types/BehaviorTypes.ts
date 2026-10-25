import { AbilityDescriptor, ActionSlotKey } from "./AbilityTypes";

export enum DefaultBehavior {
	Passive = "Passive",
	Aggressive = "Aggressive",
	Defensive = "Defensive",
	PlayerControlled = "PlayerControlled",
}

export enum BehaviorCondition {
	always = "always",
	random = "random",
	lowestLife = "lowestLife",
	selfLifeBelowHalf = "selfLifeBelowHalf",
	allyLifeBelowHalf = "allyLifeBelowHalf",
	enemyInMeleeRange = "enemyInMeleeRange",
}

export interface ActorTactic {
	condition: BehaviorCondition;
	actionType: AbilityDescriptor;
	actionSlotKey: ActionSlotKey;
	actionIndex: number;
	conditionValue?: number;
}

export function createDefaultActorTactics(): ActorTactic[] {
	return [
		{
			condition: BehaviorCondition.always,
			actionType: "weapon" as AbilityDescriptor,
			actionSlotKey: ActionSlotKey.weapon,
			actionIndex: 0,
		},
	];
}
