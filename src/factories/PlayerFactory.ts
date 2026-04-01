import { addComponent, addEntity, EntityId, set } from "bitecs";
import { container, singleton } from "tsyringe";
import GameContext from "../GameContext";
import { IFactory } from "./IFactory";
import { ActorData } from "../components/ActorData";
import { PlayerGUI } from "../components/PlayerGUI";

@singleton()
export class PlayerFactory implements IFactory {
	public start() {}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const response = await fetch(
			`/data/${campaignId}/characters/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const context = container.resolve(GameContext);
		const newEntity = addEntity(context.world);

		const newActorComp = new ActorData(rawData);
		addComponent(
			context.world,
			newEntity,
			set(context.ActorDataComponent, newActorComp),
		);

		const newPlayerGUI = new PlayerGUI(
			newEntity,
			newActorComp.name,
			`sprites/enemies/${newActorComp.spriteUrl}`,
		);
		addComponent(
			context.world,
			newEntity,
			set(context.PlayerGUIComponent, newPlayerGUI),
		);

		// const newActorComp = CreateActorComponent(rawData);
		// addComponent(
		// 	context.world,
		// 	newEntity,
		// 	set(context.ActorComponent, newActorComp),
		// );

		return newEntity;
	}
}
