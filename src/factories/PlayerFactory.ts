import { addComponent, addEntity, EntityId, set } from "bitecs";
import { container } from "tsyringe";
import { EntityFactory } from "src/factories/EntityFactory";
import { getPublicRoot } from "src/helpers/Utils";
import SceneState from "src/states/SceneState";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import ActorStateComponent from "src/components/ActorStateComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";

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

		const sceneState = container.resolve(SceneState);
		const componentRegistry = container.resolve(ComponentRegistry);

		const newEntity = addEntity(sceneState.world);

		const newActorComp = new ActorStateComponent(newEntity, rawData);
		newActorComp.isPlayer = true;
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

		const newPlayerGUI = new PlayerGUIComponent(
			newEntity,
			newActorComp.name,
			`sprites/characters/${newActorComp.spriteUrl}`,
		);
		addComponent(
			sceneState.world,
			newEntity,
			set(
				componentRegistry.getComponentArrayByComponentId<PlayerGUIComponent>(
					PlayerGUIComponent.toString(),
				),
				newPlayerGUI,
			),
		);

		return newEntity;
	}
}
