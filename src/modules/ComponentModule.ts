import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import { container } from "tsyringe";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import TransformNodeComponent from "src/components/TransformNodeComponent";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import CollisionComponent from "src/components/CollisionComponent";
import ProjectileComponent from "src/components/ProjectileComponent";

export function getComponentRegistry() {
	return container.resolve(ComponentRegistry);
}

export function getActorBehaviorComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ActorBehaviorComponent>(
		ActorBehaviorComponent.name,
	);
}

export function getActorNavigationComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ActorNavigationComponent>(
		ActorNavigationComponent.name,
	);
}

export function getCollisionComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<CollisionComponent>(
		CollisionComponent.name,
	);
}

export function getActorStateComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ActorStateComponent>(
		ActorStateComponent.name,
	);
}

export function getCharacterSpriteComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<CharacterSpriteComponent>(
		CharacterSpriteComponent.name,
	);
}
export function getEnemyGuiComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<EnemyGUIComponent>(
		EnemyGUIComponent.name,
	);
}

export function getFloatingTextComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<FloatingTextComponent>(
		FloatingTextComponent.name,
	);
}

export function getImageAnimationComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ImageAnimationComponent>(
		ImageAnimationComponent.name,
	);
}

export function getPlayerGuiComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<PlayerGUIComponent>(
		PlayerGUIComponent.name,
	);
}

export function getStickerImageComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<StickerImageComponent>(
		StickerImageComponent.name,
	);
}

export function getTransformNodeComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<TransformNodeComponent>(
		TransformNodeComponent.name,
	);
}

export function getProjectileComponentArray() {
	return getComponentRegistry().getComponentArrayByComponentId<ProjectileComponent>(
		ProjectileComponent.name,
	);
}
