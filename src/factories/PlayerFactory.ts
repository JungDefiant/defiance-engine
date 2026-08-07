import { addComponent, addEntity, EntityId, set } from "bitecs";
import { container, singleton } from "tsyringe";
import { EntityFactory } from "src/factories/EntityFactory";
import {
	ActorStateComponent,
	COMPONENT_ID_ACTORSTATE,
} from "src/components/ActorStateComponent";
import {
	COMPONENT_ID_PLAYERGUI,
	PlayerGUIComponent,
} from "src/components/PlayerGUIComponent";
import { getPublicRoot } from "src/helpers/Utils";
import SceneState from "src/states/SceneState";
import { ComponentRegistry } from "src/states/registries/ComponentRegistry";

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
				componentRegistry.getComponentArrayByComponentId(
					COMPONENT_ID_ACTORSTATE,
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
				componentRegistry.getComponentArrayByComponentId(
					COMPONENT_ID_PLAYERGUI,
				),
				newPlayerGUI,
			),
		);

		return newEntity;
	}
}
