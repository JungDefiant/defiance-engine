import { addComponent, addEntity, EntityId, set } from "bitecs";
import { EntityFactory } from "src/factories/EntityFactory";
import { getPublicRoot } from "src/modules/Utils";
import ActorStateComponent from "src/components/ActorStateComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import { getGameScene } from "src/modules/GameStateModule";
import {
	getActorStateComponentArray,
	getPlayerGuiComponentArray,
} from "src/modules/ComponentModule";
import { Nullable } from "@babylonjs/core";

const PRELOAD_CHARACTERS = ["pc_test"];

export class PlayerFactory implements EntityFactory {
	private cache: Map<string, any> = new Map();
	private loadPromises: Nullable<Promise<void>> = null;

	public start(campaignId: string) {
		this.loadPromises = this.loadAllPlayers(campaignId);
	}

	private async loadAllPlayers(campaignId: string): Promise<void> {
		await Promise.all(
			PRELOAD_CHARACTERS.map(async (fileName) => {
				try {
					const response = await fetch(
						`${getPublicRoot()}/data/${campaignId}/playableChars/${fileName}.json`,
					);
					const playerEntityData = await response.json();
					this.cache.set(fileName, playerEntityData);
				} catch (error) {
					console.error("Failed to load entity data", fileName);
				}
			}),
		);
	}

	public async createEntityFromFile(fileName: string): Promise<EntityId> {
		if (this.loadPromises) {
			await this.loadPromises;
		}

		if (!this.cache.has(fileName)) {
			return -1;
		}

		const gameScene = getGameScene();
		const newEntity = addEntity(gameScene.world);

		const playerEntityData = this.cache.get(fileName);
		const newActorComp = new ActorStateComponent(
			newEntity,
			playerEntityData,
		);
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
