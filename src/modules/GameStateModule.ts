import { FactoryRegistry } from "src/registries/FactoryRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
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

export function getSystemRegistry() {
	return container.resolve(SystemRegistry);
}

export function getGameStateRegistry() {
	return container.resolve(GameStateRegistry);
}

export function getAllGameStates() {
	return getGameStateRegistry().getAllGameStates();
}

export function getAudioState(): AudioState {
	return getGameStateRegistry().getGameStateByStateId<AudioState>(
		AudioState.toString(),
	);
}

export function getControlState(): ControlState {
	return getGameStateRegistry().getGameStateByStateId<ControlState>(
		ControlState.toString(),
	);
}

export function getDialogueState(): DialogueState {
	return getGameStateRegistry().getGameStateByStateId<DialogueState>(
		DialogueState.toString(),
	);
}

export function getGameplayState(): GameplayState {
	return getGameStateRegistry().getGameStateByStateId<GameplayState>(
		GameplayState.toString(),
	);
}

export function getRenderState(): RenderState {
	return getGameStateRegistry().getGameStateByStateId<RenderState>(
		RenderState.toString(),
	);
}

export function getUserInterfaceState(): UserInterfaceState {
	return getGameStateRegistry().getGameStateByStateId<UserInterfaceState>(
		UserInterfaceState.toString(),
	);
}
