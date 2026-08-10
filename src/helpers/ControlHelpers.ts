import { ActionEvent, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import ControlState from "src/states/ControlState";
import GameplayState from "src/states/GameplayState";
import SceneState from "src/states/SceneState";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import { container } from "tsyringe";

export function resetExploreModeControls() {
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
    const camera = sceneState.currentScene.activeCamera;
    
                if (!camera) {
                    return;
                }
    
                camera.detachControl();
                userInterfaceState.sceneGUI.rootContainer.isVisible = true;
                controlState.exploreGUIControls.forEach((child) => {
                    child.isVisible = false;
                });
                this.resetViewPosition();
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
