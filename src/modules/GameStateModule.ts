import { GameScene } from "src/scenes/GameScene";
import { UserInterfaceScene } from "src/scenes/UserInterfaceScene";
import AudioState from "src/states/AudioState";
import CampaignState from "src/states/CampaignState";
import ControlState from "src/states/ControlState";
import DialogueState from "src/states/DialogueState";
import GameplayState from "src/states/GameplayState";
import RenderState from "src/states/RenderState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { container } from "tsyringe";

export function getCampaignState(): CampaignState {
	return container.resolve(CampaignState);
}

export function getGameScene() {
	return container.resolve(GameScene);
}

export function getUserInterfaceScene() {
	return container.resolve(UserInterfaceScene);
}

export function getAllGameStates() {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getAllGameStates();
}

export function getAudioState(): AudioState {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getGameStateByStateId<AudioState>(
		AudioState.toString(),
	);
}

export function getControlState(): ControlState {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);
}

export function getDialogueState(): DialogueState {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getGameStateByStateId<DialogueState>(
		DialogueState.toString(),
	);
}

export function getGameplayState(): GameplayState {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getGameStateByStateId<GameplayState>(
		GameplayState.toString(),
	);
}

export function getRenderState(): RenderState {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getGameStateByStateId<RenderState>(
		RenderState.toString(),
	);
}

export function getUserInterfaceState(): UserInterfaceState {
	const gameScene = container.resolve(GameScene);
	return gameScene.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
		UserInterfaceState.toString(),
	);
}
