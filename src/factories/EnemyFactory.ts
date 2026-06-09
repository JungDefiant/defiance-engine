import { container, singleton } from "tsyringe";
import { IFactory } from "src/factories/IFactory";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import GameState from "src/GameState";
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

@singleton()
export class EnemyFactory implements IFactory {
	private readonly enSpritePositions: Vector3[] = [
		new Vector3(0.05, 0.4, 0),
		new Vector3(0, 0.4, 0),
		new Vector3(0.05, 0.4, 0),
	];

	private currEnemyIndex = 0;

	public start() {}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		if (this.currEnemyIndex > 2) {
			return -1;
		}

		const gameState = container.resolve(GameState);
		const locData = gameState.locationData;
		if (!gameState || !locData) {
			return -1;
		}

		const spawnNode = gameState.sceneNodes.find(
			(node) => node.id === locData.combatSpawnNodeId,
		);

		if (!spawnNode) {
			return -1;
		}

		const response = await fetch(
			`/data/${campaignId}/enemies/${fileName}.json`,
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

		const spawnPositionOffset = new Vector3(0.2, 0.28, -0.25);
		const newEnemySprite = this.createEnemySprite(
			newEntity,
			gameState,
			spawnNode,
			spawnPositionOffset,
		);

		this.currEnemyIndex++;

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
		positionOffset: Vector3,
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
		enActorSprite.locallyTranslate(positionOffset);

		enActorSpriteMat.albedoTexture = new Texture(
			`./sprites/enemies/${actorData.spriteUrl}`,
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
