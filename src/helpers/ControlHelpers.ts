import {
	ActionEvent,
	ActionManager,
	ExecuteCodeAction,
	UniversalCamera,
} from "@babylonjs/core";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import ControlState from "src/states/ControlState";
import GameplayState from "src/states/GameplayState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import { container } from "tsyringe";
import { getGameCanvas, resetCombatViewPosition } from "./SceneHelpers";
import ActorStateComponent from "src/components/ActorStateComponent";
import CombatManagerSystem from "src/systems/CombatManagerSystem";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import { resetTargeting, setTacticalPause } from "./CombatHelpers";

export function resetExploreModeControls() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const userInterfaceState =
		gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
			UserInterfaceState.toString(),
		);
	const controlState = gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);

	const camera = sceneState.currentScene.activeCamera as UniversalCamera;
	const gameCanvas = getGameCanvas();

	if (camera && gameCanvas) {
		camera.attachControl(gameCanvas);
		sceneState.currentScene.onPointerObservable.add(() => {
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
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const gameplayState =
		gameStateRegistry.getGameStateByStateId<GameplayState>(
			GameplayState.toString(),
		);
	const controlState = gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(sceneState.currentScene);

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
	sceneState.currentScene.actionManager = actionManager;
}

export function resetCombatModeControls() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const userInterfaceState =
		gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
			UserInterfaceState.toString(),
		);
	const controlState = gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);

	const camera = sceneState.currentScene.activeCamera;

	if (camera) {
		camera.detachControl();
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = false;
		});
	}
}

export async function resetCombatModeActionManager() {
	const systemRegistry = container.resolve(SystemRegistry);
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const componentRegistry = sceneState.componentRegistry;

	const combatManagerSystem =
		systemRegistry.getGameSystemBySystemId<CombatManagerSystem>(
			CombatManagerSystem.toString(),
		);
	const gameplayState =
		gameStateRegistry.getGameStateByStateId<GameplayState>(
			GameplayState.toString(),
		);
	const controlState = gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);
	const userInterfaceState =
		gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
			UserInterfaceState.toString(),
		);
	const actorData =
		componentRegistry.getComponentByEntityId<ActorStateComponent>(
			ActorStateComponent.toString(),
			gameplayState.selectedPlayerEID,
		);
	await userInterfaceState.combatHud.setActionBar(
		actorData,
		combatManagerSystem,
	);

	resetTargeting();

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(sceneState.currentScene);

	for (let i = 0; i < actorData.powerData.length; i++) {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.powerActions[i],
				},
				() => {
					const cmSystem = container.resolve(CombatManagerSystem);
					cmSystem.startQueueActionPlayer(actorData.entityId, i);
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
						const cmSystem = container.resolve(CombatManagerSystem);
						cmSystem.startQueueActionPlayer(actorData.entityId, i);
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
	sceneState.currentScene.actionManager = actionManager;
}

export function resetDialogueModeControls() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const userInterfaceState =
		gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
			UserInterfaceState.toString(),
		);
	const controlState = gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);

	const camera = sceneState.currentScene.activeCamera;

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
		const systemRegistry = container.resolve(SystemRegistry);
		const userInterfaceSystem =
			systemRegistry.getGameSystemBySystemId<UserInterfaceSystem>(
				UserInterfaceSystem.toString(),
			);

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
		userInterfaceSystem.setSelectedCharacter(
			gameplayState.playerEIDs[newSelectedPlayerEntityIdIndex],
		);
	};
}

function getSwitchPlayerLeftFunction(
	gameplayState: GameplayState,
): (evt: ActionEvent) => void {
	return () => {
		const systemRegistry = container.resolve(SystemRegistry);
		const userInterfaceSystem =
			systemRegistry.getGameSystemBySystemId<UserInterfaceSystem>(
				UserInterfaceSystem.toString(),
			);

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
		userInterfaceSystem.setSelectedCharacter(
			gameplayState.playerEIDs[newSelectedPlayerEntityIdIndex],
		);
	};
}
