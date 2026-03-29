import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import SceneManagerSystem from "./SceneManagerSystem";
import { Nullable, SpriteManager } from "@babylonjs/core";

export interface IActorStateSystem extends ISystem {
	getActorDataById(id: string): Nullable<ActorData>;
}

@singleton()
export default class ActorStateSystem implements IActorStateSystem {
	private affinityData: Map<string, AffinityData> = new Map<
		string,
		AffinityData
	>();
	private actorData: Map<string, ActorData> = new Map<string, ActorData>();
	private actionData: Map<string, ActionData> = new Map<string, ActionData>();
	private tacticsData: Map<string, TacticsData> = new Map<
		string,
		TacticsData
	>();

	public async start() {
		const smSystem = container.resolve(SceneManagerSystem);

		if (!smSystem) {
			return;
		}

		const dataToProcess = [];

		// Import actor files
		const charData = await import.meta.glob("/src/data/*/characters/*.json");
		for (const path in charData) {
			const campaignId = path.split("/")[3];
			if (campaignId == smSystem.getCampaignId()) {
				const data = await charData[path]();
				dataToProcess.push(data);
			}
		}

		const enData = await import.meta.glob("/src/data/*/enemies/*.json");
		for (const path in enData) {
			const campaignId = path.split("/")[3];
			if (campaignId == smSystem.getCampaignId()) {
				const data = await enData[path]();
				dataToProcess.push(data);
			}
		}

		for (let i = 0; i < dataToProcess.length; i++) {
			const rawData = dataToProcess[i] as any;
			const newActorData = {} as ActorData;
			newActorData.id = rawData.id;
			newActorData.name = rawData.name;
			newActorData.backstory = rawData.backstory;
			newActorData.description = rawData.description;
			newActorData.spriteUrl = rawData.spriteUrl;
			newActorData.attributes = {
				life: {
					baseValue: rawData.attributes.life,
				} as ActorAttribute,
				will: {
					baseValue: rawData.attributes.life,
				} as ActorAttribute,
				speed: {
					baseValue: rawData.attributes.life,
				} as ActorAttribute,
				defense: {
					baseValue: rawData.attributes.life,
				} as ActorAttribute,
				critical: {
					baseValue: rawData.attributes.life,
				} as ActorAttribute,
				regen: {
					baseValue: rawData.attributes.life,
				} as ActorAttribute,
			};
			newActorData.affinityData = this.affinityData.get(rawData.affinityId);
			newActorData.abilityData = rawData.abilityIds.map((el: string) => {
				return this.actionData.get(el);
			});
			newActorData.itemData = rawData.itemIds.map((el: string) => {
				return this.actionData.get(el);
			});
			newActorData.tactics = rawData.tactics;
		}
	}

	public update(): void {}

	public getActorDataById(id: string): Nullable<ActorData> {
		return this.actorData.get(id) || null;
	}
}

export interface ActorData {
	id: string;
	name: string;
	backstory: string;
	description: string;
	spriteUrl: string;
	attributes: {
		life: ActorAttribute;
		will: ActorAttribute;
		speed: ActorAttribute;
		defense: ActorAttribute;
		critical: ActorAttribute;
		regen: ActorAttribute;
	};
	affinityData?: AffinityData;
	abilityData: ActionData[];
	itemData?: ActionData[];
	tactics?: TacticsData[];
}

interface ActorAttribute {
	baseValue: number;
	currentValue?: number;
	maximumValue?: number;
}

interface AffinityData {
	baseAttributes: ActorAttribute[];
}

interface ActionData {
	id: string;
	name: string;
	description: string;
	castVfxURL: string;
	hitVfxURL: string;
	castSfxURL: string;
	hitSfxURL: string;
	trigger: ActionTrigger;
	descriptors: ActionDescriptor[];
	target: ActionTarget;
	recovery: number;
	cost: number;
	effectData: EffectData[];
}

interface EffectData {
	id: string;
	variables: number[];
}

interface TacticsData {
	condition: TacticsCondition;
	actionId: string;
}

enum ActionTrigger {
	action,
}

enum ActionDescriptor {
	melee,
	impact,
	innate,
	attack,
}

enum ActionTarget {
	singleEnemy,
	groupEnemy,
	singleAlly,
	groupAlly,
	self,
}

enum TacticsCondition {
	onChance50,
	vsHighestLife,
}
