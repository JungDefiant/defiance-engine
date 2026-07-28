import { RandomRange } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import { PAUSE_TACTICALPAUSE } from "src/Constants";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTarget,
	ActorState,
	TacticsCondition,
	TacticsData,
} from "src/components/ActorState";
import GameState from "src/states/GameState";
import { CombatState } from "src/systems/CombatManagerSystem";
import { container } from "tsyringe";

export function setTacticalPause(isActive: boolean, gameState: GameState) {
	if (isActive) {
		gameState.actionPauseSet.add(PAUSE_TACTICALPAUSE);
		gameState.renderPauseSet.add(PAUSE_TACTICALPAUSE);
	} else {
		gameState.actionPauseSet.delete(PAUSE_TACTICALPAUSE);
		gameState.renderPauseSet.delete(PAUSE_TACTICALPAUSE);
	}

	gameState.tacticalPauseScreen.showHide(isActive);
}

export function getTargetsBasedOnCondition(
	actionData: AbilityData,
	tacticEntry: TacticsData,
	sourceEid: EntityId,
	gameState?: GameState,
): EntityId[] {
	if (!gameState) {
		gameState = container.resolve(GameState);
	}

	// Check if ability condition is true
	switch (tacticEntry.condition) {
		case TacticsCondition.random:
			return getRandomTarget(actionData, sourceEid, gameState);
		case TacticsCondition.lowestLife:
			return getLowestLifeTarget(actionData, sourceEid, gameState);
		default:
			return [];
	}
}

export function resetTargeting(gameState: GameState) {
	for (const eid of query(gameState.world, [gameState.EnemyGUIComponent])) {
		const enemyGUI = gameState.EnemyGUIComponent[eid];
		enemyGUI.setVisibleTargetingUI(false);
		enemyGUI.setTargetingCallback(() => {});
	}
}

export function defeatActor(actor: ActorState) {
	const gameState = container.resolve(GameState);
	actor.isDefeated = true;

	if (gameState.playerEIDs.includes(actor.entityId)) {
		for (let i = 0; i < gameState.playerEIDs.length; i++) {
			let eid = gameState.playerEIDs[i];
			let playerData = gameState.ActorDataComponent[eid];
			if (!playerData.isDefeated) {
				return;
			}
		}

		gameState.combatState = CombatState.Gameover;
	} else {
		for (let i = 0; i < gameState.enemyEIDs.length; i++) {
			let eid = gameState.enemyEIDs[i];
			let enemyData = gameState.ActorDataComponent[eid];
			if (!enemyData.isDefeated) {
				return;
			}
		}

		gameState.combatState = CombatState.Victory;
	}
}

export function getRandomTarget(
	actionData: AbilityData,
	sourceEid: EntityId,
	gs: GameState,
) {
	let targetEids = getTargetEidsByActionTargetType(
		actionData.target,
		sourceEid,
		gs,
		true,
	);
	let rand = RandomRange(0, targetEids.length - 1);
	const targetEid = targetEids[Math.round(rand)];
	return targetEid >= 0 && targetEid < targetEids.length ? [targetEid] : [];
}

export function getLowestLifeTarget(
	actionData: AbilityData,
	sourceEid: EntityId,
	gs: GameState,
) {
	let targetEids = getTargetEidsByActionTargetType(
		actionData.target,
		sourceEid,
		gs,
		true,
	);
	let lowestLifeEid = -1;
	let lowestLifeValue = Infinity;

	targetEids.forEach((eid) => {
		const currLife =
			gs.ActorDataComponent[eid].attributes.life.currentValue;
		if (currLife < lowestLifeValue) {
			lowestLifeEid = eid;
			lowestLifeValue = currLife;
		}
	});
	return [lowestLifeEid];
}

export function getTargetEidsByActionTargetType(
	abilityTarget: AbilityTarget,
	sourceEid: EntityId,
	gs: GameState,
	isSingleTarget: boolean = false,
) {
	switch (abilityTarget) {
		case AbilityTarget.self:
			return [sourceEid];
		case AbilityTarget.groupAlly:
		case AbilityTarget.singleAlly:
			if (isSingleTarget && abilityTarget === AbilityTarget.groupAlly) {
				return [];
			} else {
				if (gs.playerEIDs.includes(sourceEid)) {
					return gs.enemyEIDs;
				} else if (gs.enemyEIDs.includes(sourceEid)) {
					return gs.playerEIDs;
				}
			}
		case AbilityTarget.groupEnemy:
		case AbilityTarget.singleEnemy:
			if (isSingleTarget && abilityTarget === AbilityTarget.groupAlly) {
				return [];
			} else {
				if (gs.playerEIDs.includes(sourceEid)) {
					return gs.playerEIDs;
				} else if (gs.enemyEIDs.includes(sourceEid)) {
					return gs.enemyEIDs;
				}
			}
		default:
			return [];
	}
}
