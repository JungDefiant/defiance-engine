import { container } from "tsyringe";
import {
	Engine,
	TransformNode,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import ControlState from "src/states/ControlState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import {
	resetCombatModeControls,
	resetDialogueModeControls,
	resetExploreModeControls,
} from "./ControlHelpers";

export function getGameCanvas(): HTMLCanvasElement {
	const engine = container.resolve(Engine);
	return engine.getRenderingCanvas() as HTMLCanvasElement;
}

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
	resetExploreViewPosition();
	resetExploreModeControls();
}

export function setCombatGameMode() {
	resetCombatViewPosition();
	resetCombatModeControls();
}

export function setDialogueGameMode() {
	resetDialogueModeControls();
}

export function resetExploreViewPosition() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);

	const camera = sceneState.currentScene.activeCamera as UniversalCamera;
	const currentLocation = sceneState.currentLocation;
	if (!currentLocation) {
		console.warn("NO LOCATION DATA");
		return;
	}

	const viewNodeId = currentLocation.exploreViewNodeId;
	if (viewNodeId === "") {
		console.warn("NO VIEW NODE ID");
		return;
	}

	let camTarget = DEFAULT_CAM_TARGET;
	if (sceneState.lastExploreViewTarget !== Vector3.Zero()) {
		camTarget = sceneState.lastExploreViewTarget;
		camTarget.y = DEFAULT_CAM_TARGET.y;
	}
	camera.setTarget(camTarget);

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

	const camera = sceneState.currentScene.activeCamera as UniversalCamera;
	const currentLocation = sceneState.currentLocation;
	if (!currentLocation) {
		console.warn("NO LOCATION");
		return;
	}

	const viewNodeId = currentLocation.combatViewNodeId;
	if (viewNodeId === "") {
		console.warn("NO VIEW NODE ID");
		return;
	}

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
		camera.setTarget(camTarget);
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
