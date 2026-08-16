import {
	ActionEvent,
	ActionManager,
	ExecuteCodeAction,
	UniversalCamera,
} from "@babylonjs/core";
import GameplayState from "src/states/GameplayState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { getGameCanvas } from "./SceneModule";
import ActorStateComponent from "src/components/ActorStateComponent";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import {
	resetTargeting,
	setTacticalPause,
	startQueueActionPlayer,
} from "./CombatModule";
import {
	getControlState,
	getGameplayState,
	getGameScene,
	getUserInterfaceScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { setSelectedCharacter } from "./UserInterfaceModule";

export function clearControlActionPause() {
	const controlState = getControlState();
	if (controlState.actionPauseSet.size > 0) {
		controlState.actionPauseSet.clear();
	}
}

export function resetExploreModeControls() {
	const gameScene = getUserInterfaceScene();
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	const camera = gameScene.activeCamera as UniversalCamera;
	const gameCanvas = getGameCanvas();

	if (camera && gameCanvas) {
		camera.attachControl(gameCanvas);
		gameScene.onPointerObservable.add(() => {
			// This will block out vertical rotation
			// For blocking out horizontal rotation, simply use y instead of x
			camera.cameraRotation.x = 0;
		});
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = true;
		});
	}
}

export function resetExploreModeActionManager() {
	const gameScene = getGameScene();
	const gameplayState = getGameplayState();
	const controlState = getControlState();

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(gameScene);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerLeft,
			},
			getSwitchPlayerLeftFunction(gameplayState),
		),
	);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerRight,
			},
			getSwitchPlayerRightFunction(gameplayState),
		),
	);

	controlState.actionManager = actionManager;
	gameScene.actionManager = actionManager;
}

export function resetCombatModeControls() {
	const gameScene = getGameScene();
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	const camera = gameScene.activeCamera;

	if (camera) {
		camera.detachControl();
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = false;
		});
	}
}

export async function resetCombatModeActionManager() {
	const gameScene = getGameScene();
	const gameplayState = getGameplayState();
	const controlState = getControlState();
	const userInterfaceState = getUserInterfaceState();
	const actorData =
		gameScene.componentRegistry.getComponentByEntityId<ActorStateComponent>(
			ActorStateComponent.toString(),
			gameplayState.selectedPlayerEID,
		);
	await userInterfaceState.combatHud.setActionBar(actorData);

	resetTargeting();

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(gameScene);

	for (let i = 0; i < actorData.powerData.length; i++) {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.powerActions[i],
				},
				() => {
					startQueueActionPlayer(actorData.entityId, i);
				},
			),
		);
	}

	if (actorData.itemData) {
		for (let i = 0; i < actorData.itemData.length; i++) {
			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter:
							controlState.controlSettings.deviceActions[i],
					},
					() => {
						startQueueActionPlayer(actorData.entityId, i);
					},
				),
			);
		}
	}

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.tacticalPause,
			},
			() => {
				setTacticalPause(
					!controlState.actionPauseSet.has(PAUSE_TACTICALPAUSE),
				);
			},
		),
	);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerLeft,
			},
			getSwitchPlayerLeftFunction(gameplayState),
		),
	);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerRight,
			},
			getSwitchPlayerRightFunction(gameplayState),
		),
	);

	controlState.actionManager = actionManager;
	gameScene.actionManager = actionManager;
}

export function resetDialogueModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	const camera = getGameScene().activeCamera;

	if (camera) {
		camera.detachControl();
		userInterfaceState.sceneGUI.rootContainer.isVisible = false;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = false;
		});
	}
}

function getSwitchPlayerRightFunction(
	gameplayState: GameplayState,
): (evt: ActionEvent) => void {
	return () => {
		let currentSelectedPlayerEntityIdIndex =
			gameplayState.playerEIDs.findIndex(
				(x) => x === gameplayState.selectedPlayerEID,
			);
		let newSelectedPlayerEntityIdIndex =
			currentSelectedPlayerEntityIdIndex + 1;
		if (
			newSelectedPlayerEntityIdIndex >
			gameplayState.playerEIDs.length - 1
		) {
			newSelectedPlayerEntityIdIndex = 0;
		}
		setSelectedCharacter(
			gameplayState.playerEIDs[newSelectedPlayerEntityIdIndex],
		);
	};
}

function getSwitchPlayerLeftFunction(
	gameplayState: GameplayState,
): (evt: ActionEvent) => void {
	return () => {
		let currentSelectedPlayerEntityIdIndex =
			gameplayState.playerEIDs.findIndex(
				(x) => x === gameplayState.selectedPlayerEID,
			);
		let newSelectedPlayerEntityIdIndex =
			currentSelectedPlayerEntityIdIndex - 1;
		if (newSelectedPlayerEntityIdIndex < 0) {
			newSelectedPlayerEntityIdIndex =
				gameplayState.playerEIDs.length - 1;
		}
		setSelectedCharacter(
			gameplayState.playerEIDs[newSelectedPlayerEntityIdIndex],
		);
	};
}
