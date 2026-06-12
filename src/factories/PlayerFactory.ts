import { addComponent, addEntity, EntityId, set } from "bitecs";
import { container, singleton } from "tsyringe";
import GameState from "src/GameState";
import { IFactory } from "src/factories/IFactory";
import { ActorData } from "src/components/ActorData";
import { PlayerGUI } from "src/gui/components/PlayerGUI";

@singleton()
export class PlayerFactory implements IFactory {
	public start() {}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const response = await fetch(
			`/data/${campaignId}/playableChars/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const gameState = container.resolve(GameState);
		const newEntity = addEntity(gameState.world);

		const newActorComp = new ActorData(newEntity, rawData);
		newActorComp.isPlayer = true;
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.ActorDataComponent, newActorComp),
		);

		const newPlayerGUI = new PlayerGUI(
			newEntity,
			newActorComp.name,
			`sprites/enemies/${newActorComp.spriteUrl}`,
		);
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.PlayerGUIComponent, newPlayerGUI),
		);

		return newEntity;
	}
}
