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
	): Mesh {
		const gameScene = getGameScene();
		const actorData =
			gameScene.componentRegistry.getComponentByEntityId<ActorStateComponent>(
				ActorStateComponent.toString(),
				entityId,
			);

		const enActorSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${actorData.id}_${entityId}`,
			{
				width: 0.4,
				height: 0.8,
			},
			gameScene,
		);

		const enActorSpriteMat = new PBRMaterial(
			`mat_enBattlerSprite_${actorData.id}_${entityId}`,
			gameScene,
		);
		enActorSprite.parent = parentNode;
		enActorSprite.billboardMode = 7;
		enActorSprite.rotate(Vector3.Forward(), Math.PI, Space.WORLD);
		enActorSprite.setAbsolutePosition(parentNode.absolutePosition);

		enActorSpriteMat.albedoTexture = new Texture(
			`${getPublicRoot()}/sprites/characters/${actorData.spriteUrl}`,
			gameScene,
		);
		enActorSpriteMat.metallic = 0;
		enActorSpriteMat.roughness = 0;
		enActorSpriteMat.alphaCutOff = 0.4;
		enActorSpriteMat.transparencyMode = 1;
		enActorSpriteMat.useAlphaFromAlbedoTexture = true;

		enActorSprite.material = enActorSpriteMat;
		return enActorSprite;
	}
}
