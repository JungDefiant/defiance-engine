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
import { getPublicRoot } from "src/helpers/Utils";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";

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
		const sceneState = container.resolve(SceneState);
		const userInterfaceState = container.resolve(UserInterfaceState);
		const componentRegistry = container.resolve(ComponentRegistry);
		const currentLocation = sceneState.currentLocation;

		if (
			!sceneState ||
			!userInterfaceState ||
			!componentRegistry ||
			!currentLocation
		) {
			return -1;
		}

		const spawnNode = sceneState.sceneNodes.find(
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

		const newEntity = addEntity(sceneState.world);

		const newActorComp = new ActorStateComponent(newEntity, rawData);
		addComponent(
			sceneState.world,
			newEntity,
			set(
				componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
					ActorStateComponent.toString(),
				),
				newActorComp,
			),
		);

		const newEnemySprite = this.createEnemySprite(newEntity, spawnNode);

		addComponent(
			sceneState.world,
			newEntity,
			set(
				componentRegistry.getComponentArrayByComponentId<CharacterSpriteComponent>(
					CharacterSpriteComponent.toString(),
				),
				newEnemySprite,
			),
		);

		const newEnemyGUI = new EnemyGUIComponent(
			newEntity,
			userInterfaceState.sceneGUI,
		);
		addComponent(
			sceneState.world,
			newEntity,
			set(
				componentRegistry.getComponentArrayByComponentId<EnemyGUIComponent>(
					EnemyGUIComponent.toString(),
				),
				newEnemyGUI,
			),
		);

		return newEntity;
	}

	private createEnemySprite(
		entityId: EntityId,
		parentNode: TransformNode,
	): Mesh {
		const sceneState = container.resolve(SceneState);
		const componentRegistry = container.resolve(ComponentRegistry);

		const actorData =
			componentRegistry.getComponentByEntityId<ActorStateComponent>(
				ActorStateComponent.toString(),
				entityId,
			);

		const enActorSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${actorData.id}_${entityId}`,
			{
				width: 0.4,
				height: 0.8,
			},
			sceneState.currentScene,
		);

		const enActorSpriteMat = new PBRMaterial(
			`mat_enBattlerSprite_${actorData.id}_${entityId}`,
			sceneState.currentScene,
		);
		enActorSprite.parent = parentNode;
		enActorSprite.billboardMode = 7;
		enActorSprite.rotate(Vector3.Forward(), Math.PI, Space.WORLD);
		enActorSprite.setAbsolutePosition(parentNode.absolutePosition);

		enActorSpriteMat.albedoTexture = new Texture(
			`${getPublicRoot()}/sprites/characters/${actorData.spriteUrl}`,
			sceneState.currentScene,
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
