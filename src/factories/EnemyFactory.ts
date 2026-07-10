import { container, singleton } from "tsyringe";
import { IFactory } from "src/factories/IFactory";
import { addComponent, addEntity, EntityId, query, set } from "bitecs";
import GameState from "src/states/GameState";
import { ActorData } from "src/components/ActorData";
import {
	Mesh,
	MeshBuilder,
	PBRMaterial,
	Space,
	Texture,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { EnemyGUI } from "src/gui/components/EnemyGUI";
import { getPublicRoot } from "src/Utils";

@singleton()
export class EnemyFactory implements IFactory {
	public start() {}

	public async createEntityFromFileAtPosition(
		fileName: string,
		campaignId: string,
		position: Vector3,
	): Promise<EntityId> {
		const newEntity = await this.createEntityFromFile(fileName, campaignId);
		const gameState = container.resolve(GameState);
		gameState.CharacterSprite[newEntity].locallyTranslate(position);
		return newEntity;
	}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const gameState = container.resolve(GameState);
		const loc = gameState.currentLocation;
		if (!gameState || !loc) {
			return -1;
		}

		const spawnNode = gameState.sceneNodes.find(
			(node) => node.id === loc.combatSpawnNodeId,
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

		const newEntity = addEntity(gameState.world);

		const newActorComp = new ActorData(newEntity, rawData);
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.ActorDataComponent, newActorComp),
		);

		const newEnemySprite = this.createEnemySprite(
			newEntity,
			gameState,
			spawnNode,
		);

		addComponent(
			gameState.world,
			newEntity,
			set(gameState.CharacterSprite, newEnemySprite),
		);

		const newEnemyGUI = new EnemyGUI(newEntity, gameState, newEnemySprite);
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.EnemyGUIComponent, newEnemyGUI),
		);

		return newEntity;
	}

	private createEnemySprite(
		eid: EntityId,
		gameState: GameState,
		parentNode: TransformNode,
	): Mesh {
		const actorData = gameState.ActorDataComponent[eid];

		const enActorSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${actorData.id}_${eid}`,
			{
				width: 0.4,
				height: 0.8,
			},
			gameState.scene,
		);

		const enActorSpriteMat = new PBRMaterial(
			`mat_enBattlerSprite_${actorData.id}_${eid}`,
			gameState.scene,
		);
		enActorSprite.parent = parentNode;
		enActorSprite.billboardMode = 7;
		enActorSprite.rotate(Vector3.Forward(), Math.PI, Space.WORLD);
		enActorSprite.setAbsolutePosition(parentNode.absolutePosition);
		// enActorSprite.locallyTranslate(positionOffset);

		enActorSpriteMat.albedoTexture = new Texture(
			`${getPublicRoot()}/sprites/enemies/${actorData.spriteUrl}`,
			gameState.scene,
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
