import { singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Engine } from "@babylonjs/core";
import { CharacterData } from "./DialogueManagerSystem";

@singleton()
export default class CombatManagerSystem implements ISystem {
	private enemyData: Map<string, CharacterData> = new Map<
		string,
		CharacterData
	>();

	start(engine: Engine): Promise<void> {
		throw new Error("Method not implemented.");
	}
	update(): void {
		throw new Error("Method not implemented.");
	}
}
