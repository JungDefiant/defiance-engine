import { container, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import { Engine } from "@babylonjs/core";
import { ActorData } from "src/components/ActorData";
import GameState from "src/states/GameState";
import { getPublicRoot } from "src/Utils";

@singleton()
export default class SessionDataSystem implements ISystem {
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
	currentParty: ActorData[];
}
