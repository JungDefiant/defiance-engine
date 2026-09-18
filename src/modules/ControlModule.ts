import {
	ActionEvent,
	ActionManager,
	ExecuteCodeAction,
	UniversalCamera,
} from "@babylonjs/core";
import ActorStateComponent from "src/components/ActorStateComponent";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import { getGameCanvas } from "./SceneModule";
import {
	resetTargeting,
	setTacticalPause,
	startQueueActionPlayer,
} from "./CombatModule";
import {
	getControlState,
	getGameplayState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { setSelectedCharacter } from "./CharacterModule";
import { getComponentRegistry } from "./ComponentModule";

export function clearActionPause() {
	const controlState = getControlState();
	if (controlState.actionPauseSet.size > 0) {
		controlState.actionPauseSet.clear();
	}
}

export function clearControlPause() {
	const controlState = getControlState();
	if (controlState.controlPauseSet.size > 0) {
		controlState.controlPauseSet.clear();
	}
}

export function attachCameraControl(): boolean {
	const gameCanvas = getGameCanvas();
	const gameScene = getGameScene();
	const camera = gameScene.activeCamera as UniversalCamera;
	if (camera && gameCanvas) {
		camera.attachControl(gameCanvas);
		gameScene.onPointerObservable.add((eventData) => {
			// This will block out vertical rotation
			// For blocking out horizontal rotation, simply use y instead of x
			camera.cameraRotation.x = 0;
		});
		return true;
	} else {
		return false;
	}
}

export function detachCameraControl(): boolean {
	const gameScene = getGameScene();
	const camera = gameScene.activeCamera as UniversalCamera;
	if (camera) {
		camera.detachControl();
		return true;
	} else {
		return false;
	}
}

export function resetExploreModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	if (attachCameraControl()) {
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = true;
		});
	}
}

export function resetExploreModeActionManager() {
	const gameScene = getGameScene();
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
			getSwitchPlayerFunction(false),
		),
	);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerRight,
			},
			getSwitchPlayerFunction(true),
		),
	);

	controlState.actionManager = actionManager;
	gameScene.actionManager = actionManager;
}

export function resetCombatModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	if (detachCameraControl()) {
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = false;
		});
	}
}

export function resetCombatModeActionManager() {
	const gameScene = getGameScene();
	const gameplayState = getGameplayState();
	const controlState = getControlState();
	const userInterfaceState = getUserInterfaceState();
	const actorState =
		getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
			ActorStateComponent.name,
			gameplayState.selectedPlayerEID,
		);
	userInterfaceState.combatHud.setActionBar(actorState);

	resetTargeting();

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(gameScene);

	for (let i = 0; i < actorState.powerData.length; i++) {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.powerActions[i],
				},
				() => {
					if (controlState.controlPauseSet.size > 0) {
						return;
					}
					startQueueActionPlayer(actorState.entityId, i, false);
				},
			),
		);
	}

	if (actorState.itemData) {
		for (let i = 0; i < actorState.itemData.length; i++) {
			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter:
							controlState.controlSettings.deviceActions[i],
					},
					() => {
						if (controlState.controlPauseSet.size > 0) {
							return;
						}
						startQueueActionPlayer(actorState.entityId, i, true);
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
				if (controlState.controlPauseSet.size > 0) {
					return;
				}
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
			getSwitchPlayerFunction(false, true),
		),
	);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerRight,
			},
			getSwitchPlayerFunction(true, true),
		),
	);

	controlState.actionManager = actionManager;
	gameScene.actionManager = actionManager;
}

export function resetDialogueModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();
	const camera = getGameScene().activeCamera as UniversalCamera;

	if (camera) {
		camera.detachControl();
		userInterfaceState.sceneGUI.rootContainer.isVisible = false;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = false;
		});
	}
}

function getSwitchPlayerFunction(
	isRightSelection: boolean,
	isCombatMode?: boolean,
): (evt: ActionEvent) => void {
	return () => {
		const gameplayState = getGameplayState();
		const controlState = getControlState();
		if (controlState.controlPauseSet.size > 0) {
			return;
		}
		let currentSelectedPlayerEntityIdIndex =
			gameplayState.playerEntityIds.findIndex(
				(x) => x === gameplayState.selectedPlayerEID,
			);
		let newSelectedPlayerEntityIdIndex =
			currentSelectedPlayerEntityIdIndex + (isRightSelection ? 1 : -1);
		if (
			newSelectedPlayerEntityIdIndex >
			gameplayState.playerEntityIds.length - 1
		) {
			newSelectedPlayerEntityIdIndex = 0;
		}
		setSelectedCharacter(
			gameplayState.playerEntityIds[newSelectedPlayerEntityIdIndex],
			isCombatMode,
		);
	};
}
