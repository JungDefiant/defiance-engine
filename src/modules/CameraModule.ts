import { UniversalCamera, Vector3 } from "@babylonjs/core";
import { ISO_CAM_OFFSET } from "src/constants/GeneralConstants";
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
