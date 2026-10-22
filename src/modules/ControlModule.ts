import {
	ActionEvent,
	ActionManager,
	ExecuteCodeAction,
	UniversalCamera,
} from "@babylonjs/core";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import { getGameCanvas } from "./SceneModule";
import { setTacticalPause, startQueueActionPlayer } from "./CombatModule";
import {
	getControlState,
	getGameScene,
	getGameplayState,
	getUserInterfaceState,
} from "./GameStateModule";
import { setSelectedCharacter } from "./CharacterModule";
import { getActorStateComponentArray } from "./ComponentModule";
import { startCombat } from "./CombatModule";
import ControlState, { MovementInputState } from "src/states/ControlState";
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

function resetMovementInput(controlState: ControlState) {
	controlState.movementInput.forward = false;
	controlState.movementInput.back = false;
	controlState.movementInput.left = false;
	controlState.movementInput.right = false;
}

function registerMovementInputBindings(
	actionManager: ActionManager,
	controlState: ControlState,
) {
	const movementKeys: [number, keyof MovementInputState][] = [
		[controlState.controlSettings.movementForward, "forward"],
		[controlState.controlSettings.movementBack, "back"],
		[controlState.controlSettings.movementLeft, "left"],
		[controlState.controlSettings.movementRight, "right"],
	];

	for (const [movementKey, movementFlag] of movementKeys) {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: movementKey,
				},
				() => {
					controlState.movementInput[movementFlag] = true;
				},
			),
		);
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyUpTrigger,
					parameter: movementKey,
				},
				() => {
					controlState.movementInput[movementFlag] = false;
				},
			),
		);
	}
}

function startPlayerAction(actionSlotKey: ActionSlotKey, actionIndex: number) {
	const controlState = getControlState();
	const gameplayState = getGameplayState();
	if (controlState.controlPauseSet.size > 0) {
		return;
	}
	startQueueActionPlayer(
		gameplayState.selectedPlayerEID,
		actionSlotKey,
		actionIndex,
	);
}

function registerPowerKeyBindings(
	actionManager: ActionManager,
	controlState: ControlState,
) {
	controlState.controlSettings.powerKeys.forEach((powerKey, powerIndex) => {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: powerKey,
				},
				() => {
					startPlayerAction(ActionSlotKey.power, powerIndex + 1);
				},
			),
		);
	});
}

function getSwitchPlayerFunction(
	isCombatMode?: boolean,
): (evt: ActionEvent) => void {
	return () => {
		const gameplayState = getGameplayState();
		const controlState = getControlState();
		if (controlState.controlPauseSet.size > 0) {
			return;
		}
		const currentSelectedPlayerEntityIdIndex =
			gameplayState.playerEntityIds.findIndex(
				(x) => x === gameplayState.selectedPlayerEID,
			);
		const newSelectedPlayerEntityIdIndex =
			(currentSelectedPlayerEntityIdIndex + 1) %
			gameplayState.playerEntityIds.length;
		setSelectedCharacter(
			gameplayState.playerEntityIds[newSelectedPlayerEntityIdIndex],
			isCombatMode,
		);
	};
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

	resetMovementInput(controlState);

	const actionManager = new ActionManager(gameScene);

	registerMovementInputBindings(actionManager, controlState);
	registerPowerKeyBindings(actionManager, controlState);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerNext,
			},
			getSwitchPlayerFunction(false),
		),
	);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.debugStartCombat,
			},
			() => {
				if (
					controlState.controlPauseSet.size > 0 ||
					controlState.actionPauseSet.size > 0
				) {
					return;
				}
				const gameScene = getGameScene();
				const firstEncounterId = Object.keys(gameScene.encounters)[0];
				if (firstEncounterId) {
					startCombat(firstEncounterId);
				}
			},
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
			child.isVisible = true;
		});
	}
}

export function resetCombatModeActionManager() {
	const gameScene = getGameScene();
	const controlState = getControlState();
	const userInterfaceState = getUserInterfaceState();
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	const actorState =
		actorStateComponentArray[gameplayState.selectedPlayerEID];
	if (actorState) {
		userInterfaceState.combatHud.setActionBar(actorState);
	}

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	resetMovementInput(controlState);

	const actionManager = new ActionManager(gameScene);

	registerMovementInputBindings(actionManager, controlState);
	registerPowerKeyBindings(actionManager, controlState);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerNext,
			},
			getSwitchPlayerFunction(true),
		),
	);

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
