import { container, singleton } from "tsyringe";
import { IFactory } from "./IFactory";
import { addComponent, addEntity, EntityId, observe, onSet, set } from "bitecs";
import GameContext from "../GameContext";
import { ActorData } from "../components/ActorData";
import { Container } from "@babylonjs/gui";
import {
	CreateActorComponent,
	CreateEnemyGUI,
	CreateEnemySprite,
} from "./FactoryFunctions";
import { Mesh, Vector3 } from "@babylonjs/core";

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
			`/data/${campaignId}/characters/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const context = container.resolve(GameContext);
		const newEntity = addEntity(context.world);

		const newActorComp = CreateActorComponent(rawData);
		addComponent(
			context.world,
			newEntity,
			set(context.ActorComponent, newActorComp),
		);

		const newEnemySprite = CreateEnemySprite(
			newEntity,
			context,
			this.enSpritePositions[this.currEnemyIndex],
		);
		this.currEnemyIndex++;

		// const newActorComp = CreateActorComponent(rawData);
		// addComponent(
		// 	context.world,
		// 	newEntity,
		// 	set(context.ActorComponent, newActorComp),
		// );
		const newEnemyGUI = CreateEnemyGUI(newEntity, context, newEnemySprite);
		addComponent(context.world, newEntity, newEnemySprite);

		return newEntity;
	}
}
