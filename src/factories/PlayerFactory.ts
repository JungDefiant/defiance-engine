import { addComponent, addEntity, EntityId, set } from "bitecs";
import { container } from "tsyringe";
import { EntityFactory } from "src/factories/EntityFactory";
import { getPublicRoot } from "src/modules/Utils";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import ActorStateComponent from "src/components/ActorStateComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import { getGameScene } from "src/modules/GameStateModule";
import {
	getActorStateComponentArray,
	getPlayerGuiComponentArray,
} from "src/modules/ComponentModule";

export const FACTORY_ID_PLAYER = "PlayerFactory";

export class PlayerFactory implements EntityFactory {
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

		const gameScene = getGameScene();

		const newEntity = addEntity(gameScene.world);

		const newActorComp = new ActorStateComponent(newEntity, rawData);
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

		return newEntity;
	}
}
