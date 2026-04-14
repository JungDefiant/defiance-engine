import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Engine } from "@babylonjs/core";
import { ActorData } from "../components/ActorData";
import GameContext from "../GameContext";

export interface ISessionDataSystem extends ISystem {}

@singleton()
export default class SessionDataSystem implements ISessionDataSystem {
	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number): void {}

	public async loadSaveData(id: string): Promise<SaveData> {
		// TEST
		const response = await fetch(`/data/sav_test.json`);
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
