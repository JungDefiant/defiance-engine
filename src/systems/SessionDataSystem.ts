import { container, inject, singleton } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import { Engine } from "@babylonjs/core";
import { ActorStateComponent } from "src/components/ActorStateComponent";
import { getPublicRoot } from "src/helpers/Utils";
import { SystemRegistry } from "src/states/registries/SystemRegistry";

//Convert this into a helper file

export default class SessionDataSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
	) {}

	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number): void {}

	public async loadSaveData(id: string): Promise<SaveData> {
		// TEST
		const response = await fetch(`${getPublicRoot()}/data/sav_test.json`);
		const rawData = await response.json();
		return rawData;

		// TO DO: Load save data by reading JSON submitted through html
		// Maybe convert save data to binary format?
	}
}

export interface SaveData {
	campaignId: string;
	sceneId: string;
	locationId: string;
	flagIds: any[];
	currentParty: ActorStateComponent[];
}
