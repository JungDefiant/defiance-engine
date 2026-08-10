import { TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import ControlState from "src/states/ControlState";
import GameplayState from "src/states/GameplayState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { container } from "tsyringe";
import { resetExploreModeControls } from "./ControlHelpers";

export function getViewPositionNode(viewPositionNodeId: string) {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const viewNode = sceneState.sceneNodes.find(
		(x) => x.id === viewPositionNodeId,
	);

	return viewNode;
}

export function setExploreGameMode() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const controlState = gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);
	const userInterfaceState =
		gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
			UserInterfaceState.toString(),
		);
	const camera = sceneState.currentScene.activeCamera as UniversalCamera;

	const gameCanvas = document.getElementById(
		"gameCanvas",
	) as HTMLCanvasElement;

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
		resetExploreViewPosition();
		resetExploreModeControls();
	}
}

export function resetExploreViewPosition() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);

	if (!sceneState.currentLocation) {
		console.warn("NO LOCATION DATA");
		return;
	}

	const camera = sceneState.currentScene.activeCamera as UniversalCamera;
	const currentLocation = sceneState.currentLocation;

	let camTarget = DEFAULT_CAM_TARGET;
	const viewNodeId = currentLocation.exploreViewNodeId;
	if (sceneState.lastExploreViewTarget !== Vector3.Zero()) {
		camTarget = sceneState.lastExploreViewTarget;
		camTarget.y = DEFAULT_CAM_TARGET.y;
	}

	if (viewNodeId === "") {
		console.warn("NO VIEW NODE ID");
		return;
	}

	const viewNode = sceneState.sceneNodes.find(
		(x) => x.id === viewNodeId,
	) as TransformNode;
	resetCameraPositionToViewNode(viewNode, camera);
}

export function resetCombatViewPosition() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);

	if (!sceneState.currentLocation) {
		console.warn("NO LOCATION");
		return;
	}

	const camera = sceneState.currentScene.activeCamera as UniversalCamera;
	const currentLocation = sceneState.currentLocation;

	let camTarget = DEFAULT_CAM_TARGET;
	let spawnNode = sceneState.sceneNodes.find(
		(x) => x.id === currentLocation.combatSpawnNodeId,
	);
	if (spawnNode) {
		camTarget = new Vector3(
			spawnNode.absolutePosition.x,
			DEFAULT_CAM_TARGET.y / 2,
			spawnNode.absolutePosition.z,
		);
	}

	const viewNode = sceneState.sceneNodes.find(
		(x) => x.id === currentLocation.combatViewNodeId,
	) as TransformNode;
	resetCameraPositionToViewNode(viewNode, camera);
}

export function resetCameraPositionToViewNode(
	viewNode: TransformNode,
	camera: UniversalCamera,
) {
	if (camera && viewNode) {
		const camParent = camera.parent as TransformNode;
		if (camParent) {
			camParent.position = viewNode.absolutePosition;
		} else {
			camera.position = viewNode.absolutePosition;
		}
	}
}
