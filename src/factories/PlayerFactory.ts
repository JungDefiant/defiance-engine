import { addComponent, addEntity, EntityId, set } from "bitecs";
import {
	Mesh,
	MeshBuilder,
	Nullable,
	PBRMaterial,
	Texture,
	Vector3,
} from "@babylonjs/core";
import { EntityFactory } from "src/factories/EntityFactory";
import { getPublicRoot } from "src/modules/Utils";
import ActorStateComponent from "src/components/ActorStateComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import CollisionComponent from "src/components/CollisionComponent";
import { getGameScene, getGameplayState } from "src/modules/GameStateModule";
import {
	getActorBehaviorComponentArray,
	getActorStateComponentArray,
	getCharacterSpriteComponentArray,
	getCollisionComponentArray,
	getPlayerGuiComponentArray,
} from "src/modules/ComponentModule";
import { createNavigationAgent } from "src/modules/ActorNavigationModule";
import { DefaultBehavior } from "src/types/BehaviorTypes";
import {
	ACTOR_GROUND_Y,
	ACTOR_SPRITE_VERTICAL_OFFSET,
	BASE_MOVEMENT_SPEED,
} from "src/constants/GeneralConstants";

const PRELOAD_CHARACTERS = ["pc_test"];

const PARTY_SPAWN_OFFSETS = [
	new Vector3(0, ACTOR_GROUND_Y, 0),
	new Vector3(-0.9, ACTOR_GROUND_Y, -0.9),
	new Vector3(0.9, ACTOR_GROUND_Y, -0.9),
	new Vector3(0, ACTOR_GROUND_Y, -1.8),
];

export class PlayerFactory implements EntityFactory {
	private cache: Map<string, any> = new Map();
	private loadPromises: Nullable<Promise<void>> = null;

	public start(campaignId: string) {
		this.loadPromises = this.loadAllPlayers(campaignId);
	}

	private async loadAllPlayers(campaignId: string): Promise<void> {
		await Promise.all(
			PRELOAD_CHARACTERS.map(async (fileName) => {
				try {
					const response = await fetch(
						`${getPublicRoot()}/data/${campaignId}/playableChars/${fileName}.json`,
					);
					const playerEntityData = await response.json();
					this.cache.set(fileName, playerEntityData);
				} catch (error) {
					console.error("Failed to load entity data", fileName);
				}
			}),
		);
	}

	public async createEntityFromFile(fileName: string): Promise<EntityId> {
		if (this.loadPromises) {
			await this.loadPromises;
		}

		if (!this.cache.has(fileName)) {
			return -1;
		}

		const gameScene = getGameScene();
		const newEntity = addEntity(gameScene.world);

		const playerEntityData = this.cache.get(fileName);
		const newActorComp = new ActorStateComponent(
			newEntity,
			playerEntityData,
		);
		newActorComp.isPlayer = true;
		addComponent(
			gameScene.world,
			newEntity,
			set(getActorStateComponentArray(), newActorComp),
		);

		const newPlayerGUI = new PlayerGUIComponent(
			newEntity,
			newActorComp.name,
			`sprites/characters/${newActorComp.spriteUrl}`,
		);
		addComponent(
			gameScene.world,
			newEntity,
			set(getPlayerGuiComponentArray(), newPlayerGUI),
		);

		const spawnSlot = getGameplayState().playerEntityIds.length;
		const spawnOffset =
			PARTY_SPAWN_OFFSETS[spawnSlot % PARTY_SPAWN_OFFSETS.length];
		const spawnPosition = spawnOffset.clone();

		const newPlayerSprite = this.createPlayerSprite(
			newEntity,
			newActorComp,
			spawnPosition,
		);
		addComponent(
			gameScene.world,
			newEntity,
			set(getCharacterSpriteComponentArray(), newPlayerSprite),
		);

		createNavigationAgent(newEntity, spawnPosition, BASE_MOVEMENT_SPEED);
		addComponent(
			gameScene.world,
			newEntity,
			set(
				getActorBehaviorComponentArray(),
				new ActorBehaviorComponent(
					newEntity,
					DefaultBehavior.Aggressive,
					newActorComp.tactics,
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

	private createPlayerSprite(
		entityId: EntityId,
		actorState: ActorStateComponent,
		spawnPosition: Vector3,
	): CharacterSpriteComponent {
		const gameScene = getGameScene();

		const playerSprite = MeshBuilder.CreatePlane(
			`pcSprite_${actorState.id}_${entityId}`,
			{
				width: 0.4,
				height: 0.8,
			},
			gameScene,
		);

		const playerSpriteMaterial = new PBRMaterial(
			`mat_pcSprite_${actorState.id}_${entityId}`,
			gameScene,
		);
		playerSprite.billboardMode = Mesh.BILLBOARDMODE_ALL;
		playerSprite.position.copyFrom(spawnPosition);
		playerSprite.position.y =
			spawnPosition.y + ACTOR_SPRITE_VERTICAL_OFFSET;
		playerSprite.metadata = { entityId };

		playerSpriteMaterial.albedoTexture = new Texture(
			`${getPublicRoot()}/sprites/characters/${actorState.spriteUrl}`,
			gameScene,
		);
		playerSpriteMaterial.metallic = 0;
		playerSpriteMaterial.roughness = 0;
		playerSpriteMaterial.alphaCutOff = 0.4;
		playerSpriteMaterial.transparencyMode = 1;
		playerSpriteMaterial.useAlphaFromAlbedoTexture = true;

		playerSprite.material = playerSpriteMaterial;

		return new CharacterSpriteComponent(playerSprite);
	}
}
