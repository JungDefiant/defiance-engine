import { inject } from "tsyringe";
import GameSystem from "./GameSystem";
import { UniversalCamera, Vector3 } from "@babylonjs/core";
import { GameScene } from "src/scenes/GameScene";
import { getActorNavigationComponentArray } from "src/modules/ComponentModule";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import { ISO_CAM_OFFSET, PAUSE_DIALOGUE } from "src/constants/GeneralConstants";

export default class CameraSystem implements GameSystem {
	public constructor(@inject(GameScene) private gameScene: GameScene) {}

	public update(deltaTime: number): void {
		const controlState = getControlState();
		if (controlState.actionPauseSet.has(PAUSE_DIALOGUE)) {
			return;
		}

		const gameplayState = getGameplayState();
		const navigationComponentArray = getActorNavigationComponentArray();
		const selectedNavigation =
			navigationComponentArray[gameplayState.selectedPlayerEID];
		if (!selectedNavigation) {
			return;
		}

		this.updateIsometricCameraFollow(selectedNavigation.position);
	}

	private updateIsometricCameraFollow(focusPosition: Vector3): void {
		const camera = this.gameScene.activeCamera as UniversalCamera;
		if (!camera) {
			return;
		}

		const focusTarget = focusPosition.clone();
		camera.position.copyFrom(focusTarget.add(ISO_CAM_OFFSET));
		camera.setTarget(focusTarget);
	}
}
