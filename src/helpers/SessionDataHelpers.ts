import { ActorStateComponent } from "src/components/ActorStateComponent";
import { getPublicRoot } from "./Utils";

export async function loadSaveData(id: string): Promise<SaveData> {
	// TEST
	const response = await fetch(`${getPublicRoot()}/data/sav_test.json`);
	const rawData = await response.json();
	return rawData;

	// TO DO: Load save data by reading JSON submitted through html
	// Maybe convert save data to binary format?
}

export interface SaveData {
	campaignId: string;
	sceneId: string;
	locationId: string;
	flagIds: any[];
	currentPartyActorStates: ActorStateComponent[];
}
