import EntityMovementComponent from "src/components/EntityMovementComponent";
import { getGameScene } from "./GameStateModule";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import { container } from "tsyringe";
import { ComponentRegistry } from "src/registries/ComponentRegistry";

export function getComponentRegistry() {
	return container.resolve(ComponentRegistry);
}

export function getActorStateComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ActorStateComponent>(
		ActorStateComponent.toString(),
	);
}

export function getCharacterSpriteComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<CharacterSpriteComponent>(
		CharacterSpriteComponent.toString(),
	);
}
export function getEntityMovementComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<EntityMovementComponent>(
		EntityMovementComponent.toString(),
	);
}

export function getEnemyGuiComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<EnemyGUIComponent>(
		EnemyGUIComponent.toString(),
	);
}

export function getFloatingTextComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<FloatingTextComponent>(
		FloatingTextComponent.toString(),
	);
}

export function getImageAnimationComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ImageAnimationComponent>(
		ImageAnimationComponent.toString(),
	);
}

export function getPlayerGuiComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<PlayerGUIComponent>(
		PlayerGUIComponent.toString(),
	);
}

export function getStickerImageComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<StickerImageComponent>(
		StickerImageComponent.toString(),
	);
}
