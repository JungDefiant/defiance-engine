import { container } from "tsyringe";
import { EntityId } from "bitecs";
import { Nullable } from "@babylonjs/core";
import { getPublicRoot } from "src/helpers/Utils";
import CampaignState from "src/states/CampaignState";
import { Component } from "src/registries/ComponentRegistry";

export const COMPONENT_ID_ACTORSTATE = "ActorState";

const BASE_REGEN_TICKS: number = 4;

export class ActorStateComponent implements Component {
	entityId: EntityId;
	id: string = "";
	name: string = "";
	backstory: string = "";
	description: string = "";
	spriteUrl: string = "";
	attributes: AttributeSet = {};
	powerData: AbilityData[] = [];
	featData: AbilityData[] = [];
	currentTargetEIDs: number[] = [];
	currentStatuses: EffectData[] = [];
	isPlayer: boolean = false;
	isDefeated: boolean = false;
	affinityData?: AffinityData;
	itemData?: AbilityData[];
	tactics?: TacticsData[];
	queuedAction?: Nullable<AbilityData>;

	public constructor(entityId: number, initData: any) {
		this.entityId = entityId;
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
			regenTimer: {
				baseValue: +(
					BASE_REGEN_TICKS *
					(10 / initData.attributes.regen)
				).toFixed(2),
				maximumValue: +(
					BASE_REGEN_TICKS *
					(10 / initData.attributes.regen)
				).toFixed(2),
				currentValue: 0,
			} as ActorAttribute,
		};

		const campaignState = container.resolve(CampaignState);
		// newActorData.affinityData = this.affinityData.get(initData.affinityId);

		this.powerData = initData.abilityIds.map(async (el: string) => {
			const response = await fetch(
				`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/powers/${el}.json`,
			);
			const abData = (await response.json()) as AbilityData;

			return abData;
		});
		// newActorData.itemData = initData.itemIds.map((el: string) => {
		// 	return this.actionData.get(el);
		// });
		this.tactics = initData.tactics;
	}

	public getValue(): ActorStateComponent {
		return this;
	}

	public dispose(): void {}
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

export interface AbilityData {
	id: string;
	name: string;
	description: string;
	trigger: AbilityTrigger;
	descriptors: AbilityDescriptor[];
	target: AbilityTarget;
	effectData: EffectData[];
	recovery?: number;
	cost?: number;
	rechargeTime: number;
	itemId?: string;
	isConsumable?: boolean;
	isToggle?: boolean;
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
	actionType: AbilityDescriptor;
	actionIndex: number;
}

export enum AbilityTrigger {
	onActionExecute = "onActionExecute",
	onActorEffectTaken = "onActorEffectTaken",
	onActorEffectInflicted = "onActorEffectInflicted",
	onActorDefeated = "onActorDefeated",
}

export enum AbilityDescriptor {
	// Ability Type
	power = "power",
	feat = "feat",
	basic = "basic",
	// Target
	single = "single",
	group = "group",
	// Range
	direct = "direct",
	ranged = "ranged",
	melee = "melee",
	// Effect Type
	impact = "impact",
	lethal = "lethal",
	// Source Type
	innate = "innate",
	weapon = "weapon",
	device = "device",
	// Trigger
	attack = "attack",
	action = "action",
}

export enum AbilityTarget {
	self = "self",
	singleEnemy = "single_en",
	groupEnemy = "group_en",
	singleAlly = "single_al",
	groupAlly = "group_en",
}

export enum TacticsCondition {
	random = "random",
	lowestLife = "lowestLife",
}
