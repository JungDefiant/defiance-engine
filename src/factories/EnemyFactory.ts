import { container, singleton } from "tsyringe";
import { EntityFactory } from "src/factories/EntityFactory";
import { addComponent, addEntity, EntityId, query, set } from "bitecs";
import {
	Mesh,
	MeshBuilder,
	PBRMaterial,
	Space,
	Texture,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { getPublicRoot } from "src/modules/Utils";
import UserInterfaceState from "src/states/UserInterfaceState";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import {
	getGameScene,
	getUserInterfaceState,
} from "src/modules/GameStateModule";
import { getSceneNodes } from "src/modules/SceneModule";
import {
	getActorStateComponentArray,
	getCharacterSpriteComponentArray,
	getComponentRegistry,
	getEnemyGuiComponentArray,
} from "src/modules/ComponentModule";

export class EnemyFactory implements EntityFactory {
	public start() {}

	public async createEntityFromFileAtPosition(
		fileName: string,
		campaignId: string,
		position: Vector3,
	): Promise<EntityId> {
		const newEntityId = await this.createEntityFromFile(
			fileName,
			campaignId,
		);
		const componentRegistry = container.resolve(ComponentRegistry);
		const characterSprite =
			componentRegistry.getComponentByEntityId<CharacterSpriteComponent>(
				CharacterSpriteComponent.toString(),
				newEntityId,
			);
		characterSprite.locallyTranslate(position);
		return newEntityId;
	}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const gameScene = getGameScene();
		const userInterfaceState = getUserInterfaceState();
		const sceneNodes = await getSceneNodes(gameScene.mapModelId);
		const currentLocation = gameScene.currentLocation;

		if (!currentLocation) {
			throw new Error("No location found!");
		}

		const spawnNode = sceneNodes.find(
			(node) => node.id === currentLocation.combatSpawnNodeId,
		);

		if (!spawnNode) {
			return -1;
		}

		const response = await fetch(
			`${getPublicRoot()}/data/${campaignId}/enemies/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const newEntity = addEntity(gameScene.world);

		const newActorComp = new ActorStateComponent(newEntity, rawData);
		addComponent(
			gameScene.world,
			newEntity,
			set(getActorStateComponentArray(), newActorComp),
		);

		const newEnemySprite = this.createEnemySprite(newEntity, spawnNode);
		addComponent(
			gameScene.world,
			newEntity,
			set(getCharacterSpriteComponentArray(), newEnemySprite),
		);

		const newEnemyGUI = new EnemyGUIComponent(
			newEntity,
			userInterfaceState.sceneGUI,
		);
		addComponent(
			gameScene.world,
			newEntity,
			set(getEnemyGuiComponentArray(), newEnemyGUI),
		);

		return newEntity;
	}

	private createEnemySprite(
		entityId: EntityId,
		parentNode: TransformNode,
	): CharacterSpriteComponent {
		const gameScene = getGameScene();
		const actorState =
			getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
				ActorStateComponent.toString(),
				entityId,
			);

		// Need to create this sprite as a CharacterSpriteComponent
		const enemyActorSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${actorState.id}_${entityId}`,
			{
				width: 0.4,
				height: 0.8,
			},
			gameScene,
		);

		const enemyActorSpriteMaterial = new PBRMaterial(
			`mat_enBattlerSprite_${actorState.id}_${entityId}`,
			gameScene,
		);
		enemyActorSprite.parent = parentNode;
		enemyActorSprite.billboardMode = 7;
		enemyActorSprite.rotate(Vector3.Forward(), Math.PI, Space.WORLD);
		enemyActorSprite.setAbsolutePosition(parentNode.absolutePosition);

		enemyActorSpriteMaterial.albedoTexture = new Texture(
			`${getPublicRoot()}/sprites/characters/${actorState.spriteUrl}`,
			gameScene,
		);
		enemyActorSpriteMaterial.metallic = 0;
		enemyActorSpriteMaterial.roughness = 0;
		enemyActorSpriteMaterial.alphaCutOff = 0.4;
		enemyActorSpriteMaterial.transparencyMode = 1;
		enemyActorSpriteMaterial.useAlphaFromAlbedoTexture = true;

		enemyActorSprite.material = enemyActorSpriteMaterial;

		const characterSpriteComponent = new CharacterSpriteComponent(
			enemyActorSprite,
		);
		return characterSpriteComponent;
	}
}
