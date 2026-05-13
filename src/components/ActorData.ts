import { container } from "tsyringe";
import GameContext from "../GameContext";

export class ActorData {
	id: string = "";
	name: string = "";
	backstory: string = "";
	description: string = "";
	spriteUrl: string = "";
	attributes: AttributeSet = {};
	abilityData: ActionData[] = [];
	affinityData?: AffinityData;
	itemData?: ActionData[];
	tactics?: TacticsData[];
	isPlayer: boolean = false;
	queuedAction?: ActionData;
	currentTargetEIDs: number[] = [];
	currentStatuses: EffectData[] = [];

	public constructor(initData: any) {
		this.id = initData.id;
		this.name = initData.name;
		this.backstory = initData.backstory;
		this.description = initData.description;
		this.spriteUrl = initData.spriteUrl;
		this.attributes = {
			life: {
				baseValue: initData.attributes.life,
				maximumValue: initData.attributes.life,
				currentValue: initData.attributes.life,
			} as ActorAttribute,
			will: {
				baseValue: initData.attributes.will,
				maximumValue: initData.attributes.will,
				currentValue: initData.attributes.will,
			} as ActorAttribute,
			speed: {
				baseValue: initData.attributes.speed,
				maximumValue: initData.attributes.speed,
				currentValue: initData.attributes.speed,
			} as ActorAttribute,
			defense: {
				baseValue: initData.attributes.defense,
				maximumValue: initData.attributes.defense,
				currentValue: initData.attributes.defense,
			} as ActorAttribute,
			critical: {
				baseValue: initData.attributes.critical,
				maximumValue: initData.attributes.critical,
				currentValue: initData.attributes.critical,
			} as ActorAttribute,
			regen: {
				baseValue: initData.attributes.regen,
				maximumValue: initData.attributes.regen,
				currentValue: initData.attributes.regen,
			} as ActorAttribute,
			recovery: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
			} as ActorAttribute,
		};

		const context = container.resolve(GameContext);
		// newActorData.affinityData = this.affinityData.get(initData.affinityId);

		this.abilityData = initData.abilityIds.map(async (el: string) => {
			const response = await fetch(
				`/data/${context.campaignId}/abilities/${el}.json`,
			);
			const abData = (await response.json()) as ActionData;

			return abData;
		});
		// newActorData.itemData = initData.itemIds.map((el: string) => {
		// 	return this.actionData.get(el);
		// });
		this.tactics = initData.tactics;
	}
}

export interface AttributeSet {
	[index: string]: ActorAttribute;
}

export interface ActorAttribute {
	baseValue: number;
	currentValue: number;
	maximumValue: number;
}

export interface AffinityData {
	baseAttributes: ActorAttribute[];
}

export interface ActionData {
	id: string;
	name: string;
	description: string;
	trigger: ActionTrigger;
	descriptors: ActionDescriptor[];
	target: ActionTarget;
	effectData: EffectData[];
	recovery?: number;
	cost?: number;
	itemId?: string;
	isConsumable?: boolean;
	iconURL?: string;
	castVfxURL?: string;
	hitVfxURL?: string;
	castSfxURL?: string;
	hitSfxURL?: string;
}

export type EffectVar = string | number;

export interface EffectData {
	id: string;
	variables: {
		[index: string]: EffectVar;
	};
}

export interface TacticsData {
	condition: TacticsCondition;
	actionId: string;
}

export enum ActionTrigger {
	action,
	toggle,
	passive,
}

export enum ActionDescriptor {
	melee,
	impact,
	innate,
	attack,
}

export enum ActionTarget {
	self = "self",
	singleEnemy = "single_en",
	groupEnemy = "group_en",
	singleAlly = "single_al",
	groupAlly = "group_en",
}

export enum TacticsCondition {
	onChance50,
	vsHighestLife,
}
