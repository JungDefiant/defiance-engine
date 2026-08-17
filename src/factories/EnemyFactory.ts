import { container, singleton } from "tsyringe";
import { EntityFactory } from "src/factories/EntityFactory";
import { addComponent, addEntity, EntityId, query, set } from "bitecs";
import {
	Mesh,
	MeshBuilder,
	Nullable,
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

const PRELOAD_ENEMIES = ["enem_test"];

export class EnemyFactory implements EntityFactory {
	private cache: Map<string, any> = new Map();
	private loadPromises: Nullable<Promise<void>> = null;

	public start(campaignId: string) {
		this.loadPromises = this.loadAllEnemies(campaignId);
	}

	private async loadAllEnemies(campaignId: string): Promise<void> {
		await Promise.all(
			PRELOAD_ENEMIES.map(async (fileName) => {
				try {
					const response = await fetch(
						`${getPublicRoot()}/data/${campaignId}/enemies/${fileName}.json`,
					);
					const enemyEntityData = await response.json();
					this.cache.set(fileName, enemyEntityData);
				} catch (error) {
					console.error("Failed to load entity data", fileName);
				}
			}),
		);
	}

	public async createEntityFromFileAtPosition(
		fileName: string,
		position: Vector3,
	): Promise<EntityId> {
		const newEntityId = await this.createEntityFromFile(fileName);
		const componentRegistry = container.resolve(ComponentRegistry);
		const characterSprite =
			componentRegistry.getComponentByEntityId<CharacterSpriteComponent>(
				CharacterSpriteComponent.toString(),
				newEntityId,
			);
		characterSprite.locallyTranslate(position);
		return newEntityId;
	}

	public async createEntityFromFile(fileName: string): Promise<EntityId> {
		if (this.loadPromises) {
			await this.loadPromises;
		}

		if (!this.cache.has(fileName)) {
			return -1;
		}

		const enemyData = this.cache.get(fileName);
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

		const newEntity = addEntity(gameScene.world);

		const newActorComp = new ActorStateComponent(newEntity, enemyData);
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
