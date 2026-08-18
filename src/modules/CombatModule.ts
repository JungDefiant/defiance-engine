import { RandomRange, Vector3 } from "@babylonjs/core";
import { EntityId, query, removeEntity } from "bitecs";
import {
	PAUSE_RENDERQUEUE,
	PAUSE_TACTICALPAUSE,
} from "src/constants/GeneralConstants";
import ActorStateComponent, {
	AbilityData,
	AbilityDescriptor,
	AbilityTarget,
	AbilityTrigger,
	TacticsCondition,
	TacticsData,
} from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import ControlState from "src/states/ControlState";
import GameplayState from "src/states/GameplayState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { CombatState } from "src/systems/CombatManagerSystem";
import { container } from "tsyringe";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import {
	getCampaignState,
	getControlState,
	getGameplayState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { getEnemyFactory } from "./FactoryModule";
import {
	getActorStateComponentArray,
	getComponentRegistry,
	getEnemyGuiComponentArray,
} from "./ComponentModule";
import { setCombatGameMode, setExploreGameMode } from "./SceneModule";
import {
	clearControlActionPause,
	resetCombatModeActionManager,
} from "./ControlModule";
import { checkEventByTrigger } from "./EventModule";
import {
	BASE_SPAWN_POSITION,
	SPAWN_OFFSET,
	START_RECOVERY,
	START_RECOVERY_RANGE,
} from "src/constants/CombatConstants";
import { disposeEnemyEntities, resetPlayerActorState } from "./CharacterModule";
import { clearCombatHudEntries } from "./UserInterfaceModule";

export async function startCombat(encId: string): Promise<void> {
	const gameScene = getGameScene();
	const enemyFactory = getEnemyFactory();
	const controlState = getControlState();
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	await setCombatGameMode();

	const encounter = gameScene.encounters[encId];

	gameplayState.combatState = CombatState.Active;

	for (let i = 0; i < encounter.length; i++) {
		const enId = encounter[i];
		const offsetVector = new Vector3(
			0,
			0,
			(encounter.length - 1) * -SPAWN_OFFSET + i * SPAWN_OFFSET * 2,
		);
		const spawnPosition = BASE_SPAWN_POSITION.add(offsetVector);
		const newEnemy = await enemyFactory.createEntityFromFileAtPosition(
			enId,
			spawnPosition,
		);
		gameplayState.enemyEntityIds.push(newEnemy);
		const enActorData = actorStateComponentArray[newEnemy];
		enActorData.name = enActorData.name.concat(
			` ${String.fromCharCode(65 + i)}`,
		);
		decideNPCAction(enActorData);
	}

	await resetCombatModeActionManager();

	for (const eid of query(gameScene.world, [actorStateComponentArray])) {
		const actorData = actorStateComponentArray[eid];
		const rcvyAttr = actorData.attributes.recovery;
		const initRange = Math.random() * START_RECOVERY_RANGE;
		rcvyAttr.maximumValue = START_RECOVERY + initRange;
		rcvyAttr.currentValue = 0;
	}

	controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);

	checkEventByTrigger("OnCombatStart");
}

export async function endCombat() {
	combatActionManager();
	clearCombatHudEntries();
	disposeEnemyEntities();
	resetPlayerActorState();
	clearControlActionPause();
	resetCombatStateToInactive();
	await setExploreGameMode();
	checkEventByTrigger("OnCombatEnd");
}

function resetCombatStateToInactive() {
	const gameplayState = getGameplayState();
	gameplayState.combatState = CombatState.Inactive;
}

export function combatActionManager() {
	const controlState = getControlState();
	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}
}

export function setTacticalPause(isActive: boolean) {
	const controlState = getControlState();
	const userInterfaceState = getUserInterfaceState();

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
	if (tacticEntry.condition === TacticsCondition.random) {
		return getRandomTarget(actionData, sourceEid);
	} else if (tacticEntry.condition === TacticsCondition.lowestLife) {
		return getLowestLifeTarget(actionData, sourceEid);
	}

	return [];
}

export function resetTargeting() {
	const enemyGuiComponentArray = getEnemyGuiComponentArray();
	for (const eid of query(getGameScene().world, [enemyGuiComponentArray])) {
		const enemyGUI = enemyGuiComponentArray[eid];
		enemyGUI.setVisibleTargetingUI(false);
		enemyGUI.setTargetingCallback(() => {});
	}
}

export async function startQueueActionPlayer(
	eid: EntityId,
	actionInd: number,
	isItem?: boolean,
): Promise<void> {
	const actorData =
		getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
			ActorStateComponent.name,
			eid,
		);
	const actionData = (await (isItem
		? actorData.itemData && actorData.itemData[actionInd]
		: actorData.powerData[actionInd])) as AbilityData;

	if (actionData.trigger != AbilityTrigger.onActionExecute) {
		return;
	}

	setPlayerActionTargeting(eid, actionData);
}

function setPlayerActionTargeting(
	sourceEid: EntityId,
	actionData: AbilityData,
): void {
	const enemyGuiComponentArray = getEnemyGuiComponentArray();
	if (actionData.target === AbilityTarget.singleEnemy) {
		for (const eid of query(getGameScene().world, [
			enemyGuiComponentArray,
		])) {
			const enemyGUI = enemyGuiComponentArray[eid];
			enemyGUI.setVisibleTargetingUI(true);
			enemyGUI.setTargetingCallback(() => {
				finishQueueAction(actionData, sourceEid, [eid]);
				enemyGuiComponentArray.forEach((gui) =>
					gui.setVisibleTargetingUI(false),
				);
			});
		}
	}
}

export async function decideNPCAction(actorState: ActorStateComponent) {
	const tactics = actorState.tactics;

	if (!tactics) {
		return;
	}

	let actionData;
	let targetEids: EntityId[] = [];

	for (const entry of tactics) {
		const newActionData =
			(entry.actionType === AbilityDescriptor.device &&
				actorState.itemData &&
				(await actorState.itemData[entry.actionIndex])) ||
			(AbilityDescriptor.power &&
				(await actorState.powerData[entry.actionIndex]));

		if (!newActionData) {
			continue;
		}

		const isActionValid = newActionData.descriptors.includes(
			entry.actionType,
		);

		if (!isActionValid) {
			continue;
		}

		const targets = getTargetsBasedOnCondition(
			newActionData,
			entry,
			actorState.entityId,
		);

		if (targets.length > 0) {
			targetEids = [...targets];
			actionData = newActionData;
			break;
		}
	}

	if (actionData) {
		finishQueueAction(actionData, actorState.entityId, targetEids);
	}
}

function finishQueueAction(
	actionData: AbilityData,
	sourceEid: EntityId,
	targetEids: EntityId[],
): void {
	const sourceActorState =
		getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
			ActorStateComponent.name,
			sourceEid,
		);
	sourceActorState.queuedAction = actionData;
	sourceActorState.currentTargetEIDs = targetEids;
}

export function defeatActor(actor: ActorStateComponent) {
	const gameplayState = getGameplayState();
	const componentRegistry = container.resolve(ComponentRegistry);

	actor.isDefeated = true;

	if (gameplayState.playerEntityIds.includes(actor.entityId)) {
		for (let i = 0; i < gameplayState.playerEntityIds.length; i++) {
			let eid = gameplayState.playerEntityIds[i];
			let playerData =
				componentRegistry.getComponentByEntityId<ActorStateComponent>(
					ActorStateComponent.name,
					eid,
				);
			if (!playerData.isDefeated) {
				return;
			}
		}

		gameplayState.combatState = CombatState.Gameover;
	} else {
		for (let i = 0; i < gameplayState.enemyEntityIds.length; i++) {
			let eid = gameplayState.enemyEntityIds[i];
			let enemyData =
				componentRegistry.getComponentByEntityId<ActorStateComponent>(
					ActorStateComponent.name,
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
		componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
			ActorStateComponent.name,
		);

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
	const gameplayState = getGameplayState();

	// Create different classes for different kinds of ability targets
	switch (abilityTarget) {
		case AbilityTarget.self:
			return [sourceEid];
		case AbilityTarget.groupAlly:
		case AbilityTarget.singleAlly:
			if (isSingleTarget && abilityTarget === AbilityTarget.groupAlly) {
				return [];
			} else {
				if (gameplayState.playerEntityIds.includes(sourceEid)) {
					return gameplayState.playerEntityIds;
				} else if (gameplayState.enemyEntityIds.includes(sourceEid)) {
					return gameplayState.enemyEntityIds;
				}
			}
		case AbilityTarget.groupEnemy:
		case AbilityTarget.singleEnemy:
			if (isSingleTarget && abilityTarget === AbilityTarget.groupEnemy) {
				return [];
			} else {
				if (gameplayState.playerEntityIds.includes(sourceEid)) {
					return gameplayState.enemyEntityIds;
				} else if (gameplayState.enemyEntityIds.includes(sourceEid)) {
					return gameplayState.playerEntityIds;
				}
			}
		default:
			return [];
	}
}
