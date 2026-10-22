import { AbilityDescriptor, ActionSlotKey } from "./AbilityTypes";
import type { TacticsData } from "src/components/ActorStateComponent";

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

export function convertTacticsDataToActorTactics(
	tacticsData?: TacticsData[],
): ActorTactic[] {
	if (!tacticsData || tacticsData.length === 0) {
		return createDefaultActorTactics();
	}

	return tacticsData.map((entry) => ({
		condition: entry.condition as unknown as BehaviorCondition,
		actionType: entry.actionType,
		actionSlotKey: entry.actionSlotKey,
		actionIndex: entry.actionIndex,
	}));
}
