import { inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { ISceneManagerSystem } from "./SceneManagerSystem";

export interface IPartyStateSystem extends ISystem {}

@singleton()
export default class PartyStateSystem implements IPartyStateSystem {
	private characterData: Map<string, CharacterData> = new Map<
		string,
		CharacterData
	>();

	public constructor(
		@inject("SceneManagerSystem") private smSystem: ISceneManagerSystem,
	) {}

	public async start() {
		// Import dialogue files
		const allData = import.meta.glob("/src/data/enemies/*.json");
		this.characterData = new Map<string, CharacterData>();
		for (const path in allData) {
			const data = (await allData[path]()) as CharacterData;
			const encId = path.match(/dlg_[A-Za-z]+/)![0];
			this.characterData.set(encId, data);
		}
	}

	public update(): void {}
}

interface CharacterData {}
