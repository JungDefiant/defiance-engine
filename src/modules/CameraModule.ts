import { TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { GameScene } from "src/scenes/GameScene";
import { container } from "tsyringe";
import { getSceneNodes } from "./SceneModule";

export async function resetExploreViewPosition() {
	const gameScene = container.resolve(GameScene);

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

	let camTarget = DEFAULT_CAM_TARGET;
	if (gameScene.lastExploreViewTarget !== Vector3.Zero()) {
		camTarget = gameScene.lastExploreViewTarget;
		camTarget.y = DEFAULT_CAM_TARGET.y;
	}
	camera.setTarget(camTarget);

	const sceneNodes = await getSceneNodes(gameScene.mapModelId);
	const viewNode = sceneNodes.find(
		(x) => x.id === viewNodeId,
	) as TransformNode;
	resetCameraPositionToViewNode(viewNode, camera);
}

export async function resetCombatViewPosition() {
	const gameScene = container.resolve(GameScene);
	const sceneNodes = await getSceneNodes(gameScene.mapModelId);

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

	let camTarget = DEFAULT_CAM_TARGET;
	let spawnNode = sceneNodes.find(
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

	const viewNode = sceneNodes.find(
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
