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
	endPlayerEnemyActionTargeting,
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
import {
	getComponentRegistry,
	getEnemyGuiComponentArray,
} from "./ComponentModule";
import ControlState from "src/states/ControlState";
import { ActionSlotKey } from "src/types/AbilityTypes";

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
		) as ActorStateComponent;
	userInterfaceState.combatHud.setActionBar(actorState);

	resetTargeting();

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(gameScene);

	const weaponData = actorState.actionData.get(ActionSlotKey.weapon);
	const weaponActionMapArray = controlState.controlSettings.actionMap.get(
		ActionSlotKey.weapon,
	);
	if (weaponData && weaponActionMapArray) {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: weaponActionMapArray[0],
				},
				() => {
					startQueueAction(
						ActionSlotKey.weapon,
						0,
						actorState,
						controlState,
					);
				},
			),
		);
	}

	const powerDataArray = actorState.actionData.get(ActionSlotKey.power);
	const powerActionMapArray = controlState.controlSettings.actionMap.get(
		ActionSlotKey.power,
	);
	if (powerDataArray && powerActionMapArray) {
		for (let i = 0; i < powerDataArray.length; i++) {
			if (!powerActionMapArray[i]) {
				break;
			}

			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter: powerActionMapArray[i],
					},
					() => {
						startQueueAction(
							ActionSlotKey.power,
							i,
							actorState,
							controlState,
						);
					},
				),
			);
		}
	}

	const accessoryData = actorState.actionData.get(ActionSlotKey.accessory);
	const accessoryActionMapArray = controlState.controlSettings.actionMap.get(
		ActionSlotKey.accessory,
	);
	if (accessoryData && accessoryActionMapArray) {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: accessoryActionMapArray[0],
				},
				() => {
					startQueueAction(
						ActionSlotKey.accessory,
						0,
						actorState,
						controlState,
					);
				},
			),
		);
	}

	const itemDataArray = actorState.actionData.get(ActionSlotKey.item);
	const itemActionMapArray = controlState.controlSettings.actionMap.get(
		ActionSlotKey.item,
	);
	if (itemDataArray && itemActionMapArray) {
		for (let i = 0; i < itemDataArray.length; i++) {
			actionManager.registerAction(
				new ExecuteCodeAction(
					{
						trigger: ActionManager.OnKeyDownTrigger,
						parameter: itemActionMapArray[i],
					},
					() => {
						startQueueAction(
							ActionSlotKey.item,
							i,
							actorState,
							controlState,
						);
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

function startQueueAction(
	actionSlotKey: ActionSlotKey,
	actionIndex: number,
	actorState: ActorStateComponent,
	controlState: ControlState,
) {
	if (controlState.controlPauseSet.size > 0) {
		return;
	}
	if (controlState.isTargetingAction) {
		endPlayerEnemyActionTargeting(getEnemyGuiComponentArray());
	} else {
		startQueueActionPlayer(actorState.entityId, actionSlotKey, actionIndex);
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
		if (isCombatMode && controlState.isTargetingAction) {
			endPlayerEnemyActionTargeting(getEnemyGuiComponentArray());
		}
		setSelectedCharacter(
			gameplayState.playerEntityIds[newSelectedPlayerEntityIdIndex],
			isCombatMode,
		);
	};
}
