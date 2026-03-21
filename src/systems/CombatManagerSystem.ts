import { inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { ISceneManagerSystem } from "./SceneManagerSystem";

export interface ICombatManagerSystem extends ISystem {
	startCombat(encId: string): void;
}

@singleton()
export default class CombatManagerSystem implements ICombatManagerSystem {
	private enemyData: Map<string, EnemyData> = new Map<string, EnemyData>();

	public constructor(
		@inject("SceneManagerSystem") private smSystem: ISceneManagerSystem,
	) {}

	public async start() {
		// Import dialogue files
		const allData = await import.meta.glob("/src/data/*/enemies/*.json");
		for (const path in allData) {
			const campaignId = path.split("/")[3];
			if (campaignId == this.smSystem.getCampaignId()) {
				const data = (await allData[path]()) as EnemyData;
				this.enemyData.set(data.id, data);
			}
		}
	}

	public update(): void {
		throw new Error("Method not implemented.");
	}

	public startCombat(encId: string): void {}
}

interface EncounterData {}

interface EnemyData {
	id: string;
	name: string;
	description: string;
	battlerSpriteURL: string;
	attributes: {
		life: number;
		will: number;
		speed: number;
		defense: number;
		critical: number;
		regen: number;
	};
	abilityIds: string[];
	itemIds: string[];
	tactics: TacticsData[];
}

interface TacticsData {
	trigger: string;
	action: string;
}
