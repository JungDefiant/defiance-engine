import { addComponent, addEntity, EntityId, set } from "bitecs";
import { container, singleton } from "tsyringe";
import GameState from "src/states/GameState";
import { IFactory } from "src/factories/IFactory";
import { ActorState } from "src/components/ActorState";
import { PlayerGUI } from "src/gui/premades/PlayerGUI";
import { getPublicRoot } from "src/helpers/Utils";

@singleton()
export class PlayerFactory implements IFactory {
	public start() {}

	public async createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId> {
		const response = await fetch(
			`${getPublicRoot()}/data/${campaignId}/playableChars/${fileName}.json`,
		);
		const rawData = await response.json();
		if (!rawData) {
			return -1;
		}

		const gameState = container.resolve(GameState);
		const newEntity = addEntity(gameState.world);

		const newActorComp = new ActorState(newEntity, rawData);
		newActorComp.isPlayer = true;
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.ActorState, newActorComp),
		);

		const newPlayerGUI = new PlayerGUI(
			newEntity,
			newActorComp.name,
			`sprites/characters/${newActorComp.spriteUrl}`,
		);
		addComponent(
			gameState.world,
			newEntity,
			set(gameState.PlayerGUIComponent, newPlayerGUI),
		);

		return newEntity;
	}
}
