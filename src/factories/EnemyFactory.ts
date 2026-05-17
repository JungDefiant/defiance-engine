import { container, singleton } from "tsyringe";
import { IFactory } from "src/factories/IFactory";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import GameState from "src/GameState";
import { ActorData } from "src/components/ActorData";
import {
	Mesh,
	MeshBuilder,
	PBRMaterial,
	Texture,
	Vector3,
} from "@babylonjs/core";
import { EnemyGUI } from "src/components/EnemyGUI";

@singleton()
export class EnemyFactory implements IFactory {
	private readonly enSpritePositions: Vector3[] = [
		new Vector3(0, 1, -1.25),
		new Vector3(1, 1, -1.5),
		new Vector3(-1, 1, -1.5),
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

		const response = await fetch(
			`/data/${campaignId}/enemies/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const context = container.resolve(GameState);
		const newEntity = addEntity(context.world);

		const newActorComp = new ActorData(newEntity, rawData);
		addComponent(
			context.world,
			newEntity,
			set(context.ActorDataComponent, newActorComp),
		);

		const newEnemySprite = this.createEnemySprite(
			newEntity,
			context,
			this.enSpritePositions[this.currEnemyIndex],
		);
		this.currEnemyIndex++;
		addComponent(
			context.world,
			newEntity,
			set(context.EnemySprite, newEnemySprite),
		);

		// const newActorComp = CreateActorComponent(rawData);
		// addComponent(
		// 	context.world,
		// 	newEntity,
		// 	set(context.ActorComponent, newActorComp),
		// );
		const newEnemyGUI = new EnemyGUI(newEntity, context, newEnemySprite);
		addComponent(
			context.world,
			newEntity,
			set(context.EnemyGUIComponent, newEnemyGUI),
		);

		return newEntity;
	}

	private createEnemySprite(
		eid: EntityId,
		context: GameState,
		position: Vector3,
	): Mesh {
		const actorData = context.ActorDataComponent[eid];

		const enActorSprite = MeshBuilder.CreatePlane(
			`enBattlerSprite_${actorData.id}_${eid}`,
			{
				width: 1,
				height: 2,
			},
			context.scene,
		);

		const enActorSpriteMat = new PBRMaterial(
			`mat_enBattlerSprite_${actorData.id}_${eid}`,
			context.scene,
		);
		enActorSprite.billboardMode = 7;
		enActorSprite.position = position;

		enActorSpriteMat.albedoTexture = new Texture(
			`./sprites/enemies/${actorData.spriteUrl}`,
			context.scene,
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
