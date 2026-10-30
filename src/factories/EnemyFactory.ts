import { EntityFactory } from "src/factories/EntityFactory";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import {
	MeshBuilder,
	Nullable,
	PBRMaterial,
	Texture,
	Vector3,
} from "@babylonjs/core";
import { getPublicRoot } from "src/modules/Utils";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import {
	getGameScene,
	getUserInterfaceState,
} from "src/modules/GameStateModule";
import {
	getActorBehaviorComponentArray,
	getActorStateComponentArray,
	getCharacterSpriteComponentArray,
	getCollisionComponentArray,
	getEnemyGuiComponentArray,
} from "src/modules/ComponentModule";
import { createNavigationAgent } from "src/modules/ActorNavigationModule";
import { DefaultBehavior } from "src/types/BehaviorTypes";
import {
	ACTOR_SPRITE_VERTICAL_OFFSET,
	BASE_MOVEMENT_SPEED,
} from "src/constants/GeneralConstants";
import { BASE_SPAWN_POSITION } from "src/constants/CombatConstants";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import CollisionComponent from "src/components/CollisionComponent";

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
		return this.createEntityFromFile(fileName, position);
	}

	public async createEntityFromFile(
		fileName: string,
		spawnPosition?: Vector3,
	): Promise<EntityId> {
		if (this.loadPromises) {
			await this.loadPromises;
		}

		if (!this.cache.has(fileName)) {
			return -1;
		}

		const enemyData = this.cache.get(fileName);
		const gameScene = getGameScene();
		const userInterfaceState = getUserInterfaceState();

		let enemySpawnPosition = spawnPosition;
		if (!enemySpawnPosition) {
			enemySpawnPosition = BASE_SPAWN_POSITION.clone();
		}

		const newEntity = addEntity(gameScene.world);

		const newActorStateComponent = new ActorStateComponent(
			newEntity,
			enemyData,
		);
		addComponent(
			gameScene.world,
			newEntity,
			set(getActorStateComponentArray(), newActorStateComponent),
		);

		const newEnemySprite = this.createEnemySprite(
			newEntity,
			newActorStateComponent,
			enemySpawnPosition,
		);
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

		createNavigationAgent(
			newEntity,
			enemySpawnPosition,
			BASE_MOVEMENT_SPEED,
		);
		addComponent(
			gameScene.world,
			newEntity,
			set(
				getActorBehaviorComponentArray(),
				new ActorBehaviorComponent(
					newEntity,
					DefaultBehavior.Aggressive,
					newActorStateComponent.tactics,
				),
			),
		);
		addComponent(
			gameScene.world,
			newEntity,
			set(
				getCollisionComponentArray(),
				new CollisionComponent(newEntity, 0.3),
			),
		);

		return newEntity;
	}

	private createEnemySprite(
		entityId: EntityId,
		actorState: ActorStateComponent,
		spawnPosition: Vector3,
	): CharacterSpriteComponent {
		const gameScene = getGameScene();

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
		enemyActorSprite.billboardMode = 7;
		enemyActorSprite.position.copyFrom(spawnPosition);
		enemyActorSprite.position.y =
			spawnPosition.y + ACTOR_SPRITE_VERTICAL_OFFSET;
		enemyActorSprite.metadata = { entityId };

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
