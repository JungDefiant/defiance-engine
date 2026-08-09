import { RandomRange } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import {
	AbilityData,
	AbilityTarget,
	ActorStateComponent,
	COMPONENT_ID_ACTORSTATE,
	TacticsCondition,
	TacticsData,
} from "src/components/ActorStateComponent";
import {
	COMPONENT_ID_ENEMYGUI,
	EnemyGUIComponent,
} from "src/components/EnemyGUIComponent";
import ControlState from "src/states/ControlState";
import GameplayState from "src/states/GameplayState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { ComponentRegistry } from "src/states/registries/ComponentRegistry";
import { CombatState } from "src/systems/CombatManagerSystem";
import { container } from "tsyringe";

export function setTacticalPause(isActive: boolean) {
	const controlState = container.resolve(ControlState);
	const userInterfaceState = container.resolve(UserInterfaceState);

	if (isActive) {
		controlState.actionPauseSet.add(PAUSE_TACTICALPAUSE);
		controlState.renderPauseSet.add(PAUSE_TACTICALPAUSE);
	} else {
		controlState.actionPauseSet.delete(PAUSE_TACTICALPAUSE);
		controlState.renderPauseSet.delete(PAUSE_TACTICALPAUSE);
	}

	userInterfaceState.tacticalPauseScreen.showHide(isActive);
}

export function getTargetsBasedOnCondition(
	actionData: AbilityData,
	tacticEntry: TacticsData,
	sourceEid: EntityId,
): EntityId[] {
	// Check if ability condition is true
	switch (tacticEntry.condition) {
		case TacticsCondition.random:
			return getRandomTarget(actionData, sourceEid);
		case TacticsCondition.lowestLife:
			return getLowestLifeTarget(actionData, sourceEid);
		default:
			return [];
	}
}

export function resetTargeting() {
	const sceneState = container.resolve(SceneState);
	const componentRegistry = container.resolve(ComponentRegistry);
	const enemyGuiComponentArray =
		componentRegistry.getComponentArrayByComponentId(
			COMPONENT_ID_ENEMYGUI,
		) as EnemyGUIComponent[];
	for (const eid of query(sceneState.world, [enemyGuiComponentArray])) {
		const enemyGUI = enemyGuiComponentArray[eid];
		enemyGUI.setVisibleTargetingUI(false);
		enemyGUI.setTargetingCallback(() => {});
	}
}

export function defeatActor(actor: ActorStateComponent) {
	const gameplayState = container.resolve(GameplayState);
	const componentRegistry = container.resolve(ComponentRegistry);

	actor.isDefeated = true;

	if (gameplayState.playerEIDs.includes(actor.entityId)) {
		for (let i = 0; i < gameplayState.playerEIDs.length; i++) {
			let eid = gameplayState.playerEIDs[i];
			let playerData =
				componentRegistry.getComponentByEntityId<ActorStateComponent>(
					COMPONENT_ID_ACTORSTATE,
					eid,
				);
			if (!playerData.isDefeated) {
				return;
			}
		}

		gameplayState.combatState = CombatState.Gameover;
	} else {
		for (let i = 0; i < gameplayState.enemyEIDs.length; i++) {
			let eid = gameplayState.enemyEIDs[i];
			let enemyData =
				componentRegistry.getComponentByEntityId<ActorStateComponent>(
					COMPONENT_ID_ACTORSTATE,
					eid,
				);
			if (!enemyData.isDefeated) {
				return;
			}
		}

		gameplayState.combatState = CombatState.Victory;
	}
}

export function getRandomTarget(actionData: AbilityData, sourceEid: EntityId) {
	let targetEids = getTargetEidsByActionTargetType(
		actionData.target,
		sourceEid,
		true,
	);
	let rand = RandomRange(0, targetEids.length - 1);
	const targetEid = targetEids[Math.round(rand)];
	return [targetEid];
}

export function getLowestLifeTarget(
	actionData: AbilityData,
	sourceEid: EntityId,
) {
	let targetEids = getTargetEidsByActionTargetType(
		actionData.target,
		sourceEid,
		true,
	);
	let lowestLifeEid = -1;
	let lowestLifeValue = Infinity;

	const componentRegistry = container.resolve(ComponentRegistry);
	const actorStateComponentArray =
		componentRegistry.getComponentArrayByComponentId(
			COMPONENT_ID_ACTORSTATE,
		) as ActorStateComponent[];

	targetEids.forEach((eid: EntityId) => {
		const currLife =
			actorStateComponentArray[eid].attributes.life.currentValue;
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
	isSingleTarget: boolean = false,
) {
	const gameplayState = container.resolve(GameplayState);

	// Create different classes for different kinds of ability targets
	switch (abilityTarget) {
		case AbilityTarget.self:
			return [sourceEid];
		case AbilityTarget.groupAlly:
		case AbilityTarget.singleAlly:
			if (isSingleTarget && abilityTarget === AbilityTarget.groupAlly) {
				return [];
			} else {
				if (gameplayState.playerEIDs.includes(sourceEid)) {
					return gameplayState.playerEIDs;
				} else if (gameplayState.enemyEIDs.includes(sourceEid)) {
					return gameplayState.enemyEIDs;
				}
			}
		case AbilityTarget.groupEnemy:
		case AbilityTarget.singleEnemy:
			if (isSingleTarget && abilityTarget === AbilityTarget.groupEnemy) {
				return [];
			} else {
				if (gameplayState.playerEIDs.includes(sourceEid)) {
					return gameplayState.enemyEIDs;
				} else if (gameplayState.enemyEIDs.includes(sourceEid)) {
					return gameplayState.playerEIDs;
				}
			}
		default:
			return [];
	}
}
