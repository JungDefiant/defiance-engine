import EntityMovementComponent from "src/components/EntityMovementComponent";
import { getGameScene } from "./GameStateModule";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";

export function getActorStateComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
		ActorStateComponent.toString(),
	);
}

export function getCharacterSpriteComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<CharacterSpriteComponent>(
		CharacterSpriteComponent.toString(),
	);
}
export function getEntityMovementComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<EntityMovementComponent>(
		EntityMovementComponent.toString(),
	);
}

export function getEnemyGuiComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<EnemyGUIComponent>(
		EnemyGUIComponent.toString(),
	);
}

export function getFloatingTextComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<FloatingTextComponent>(
		FloatingTextComponent.toString(),
	);
}

export function getImageAnimationComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<ImageAnimationComponent>(
		ImageAnimationComponent.toString(),
	);
}

export function getPlayerGuiComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<PlayerGUIComponent>(
		PlayerGUIComponent.toString(),
	);
}

export function getStickerImageComponentArray() {
	const gameScene = getGameScene();
	return gameScene.componentRegistry.getComponentArrayByComponentId<StickerImageComponent>(
		StickerImageComponent.toString(),
	);
}
