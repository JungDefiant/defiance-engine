import { TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { GameScene } from "src/scenes/GameScene";
import { container } from "tsyringe";
import { getSceneNode } from "./SceneModule";
import { getGameScene } from "./GameStateModule";

export async function resetExploreViewPosition() {
	const gameScene = getGameScene();

	const camera = gameScene.activeCamera as UniversalCamera;
	const currentLocation = gameScene.currentLocation;
	if (!currentLocation) {
		console.warn("NO LOCATION DATA");
		return;
	}

	const viewNodeId = currentLocation.exploreViewNodeId;
	if (viewNodeId === "") {
		console.warn("NO VIEW NODE ID");
		return;
	}

	const viewNode = await getSceneNode(viewNodeId);
	if (viewNode) {
		resetCameraPositionToViewNode(viewNode);
	}

	let camTarget = DEFAULT_CAM_TARGET;
	if (gameScene.lastExploreViewTarget !== Vector3.Zero()) {
		camTarget = gameScene.lastExploreViewTarget;
	}
	camera.setTarget(camTarget);
}

export async function resetCombatViewPosition() {
	const gameScene = container.resolve(GameScene);

	const camera = gameScene.activeCamera as UniversalCamera;
	const currentLocation = gameScene.currentLocation;
	if (!currentLocation) {
		console.warn("NO LOCATION");
		return;
	}

	const viewNodeId = currentLocation.combatViewNodeId;
	if (viewNodeId === "") {
		console.warn("NO VIEW NODE ID");
		return;
	}

	const viewNode = await getSceneNode(currentLocation.combatViewNodeId);
	if (viewNode) {
		console.log(
			"VIEW NODE POS",
			viewNode.getPositionExpressedInLocalSpace(),
		);
		resetCameraPositionToViewNode(viewNode);
	}

	gameScene.lastExploreViewTarget = camera.target;

	let camTarget = DEFAULT_CAM_TARGET;
	let spawnNode = await getSceneNode(currentLocation.combatSpawnNodeId);
	if (spawnNode) {
		console.log("SPAWN POS", spawnNode.getAbsolutePosition());
		camTarget = new Vector3(
			spawnNode.getAbsolutePosition().x,
			DEFAULT_CAM_TARGET.y / 2,
			spawnNode.getAbsolutePosition().z,
		);
		camera.setTarget(camTarget);
	}
}

export function resetCameraPositionToViewNode(viewNode: TransformNode) {
	const gameScene = getGameScene();
	const activeCamera = gameScene.activeCamera;
	if (activeCamera) {
		activeCamera.position = viewNode.getPositionExpressedInLocalSpace();
	}
}
