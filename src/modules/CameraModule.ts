import { TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { ISO_CAM_OFFSET } from "src/constants/GeneralConstants";
import { getSceneNode } from "./SceneModule";
import { getGameScene } from "./GameStateModule";

export function updateIsometricCameraFollow(focusPosition: Vector3) {
	const gameScene = getGameScene();
	const camera = gameScene.activeCamera as UniversalCamera;
	if (!camera) {
		return;
	}

	const focusTarget = new Vector3(
		focusPosition.x,
		focusPosition.y,
		focusPosition.z,
	);
	camera.position.copyFrom(focusTarget.add(ISO_CAM_OFFSET));
	camera.setTarget(focusTarget);
}

export async function resetExploreViewPosition() {
	const gameScene = getGameScene();
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
		updateIsometricCameraFollow(viewNode.getAbsolutePosition());
	}
}

export async function resetCombatViewPosition() {
	const gameScene = getGameScene();
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
		updateIsometricCameraFollow(viewNode.getAbsolutePosition());
	}
}

export function resetCameraPositionToViewNode(
	viewNode: TransformNode,
	useAbsolutePosition: boolean,
) {
	const gameScene = getGameScene();
	const activeCamera = gameScene.activeCamera;
	if (activeCamera) {
		const focusPosition = useAbsolutePosition
			? viewNode.getAbsolutePosition()
			: viewNode.getPositionExpressedInLocalSpace();
		updateIsometricCameraFollow(focusPosition);
	}
}
