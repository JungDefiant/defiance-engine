import { container } from "tsyringe";
import { EntityId } from "bitecs";
import { Nullable } from "@babylonjs/core";
import { getPublicRoot } from "src/modules/Utils";
import CampaignState from "src/states/CampaignState";
import { Component } from "./Component";

const BASE_LIFE_REGEN_TICKS: number = 4;
const BASE_WILL_REGEN_TICKS: number = 4;
const BASE_ATTRIBUTES = {
	lifePoints: 60,
	lifePerPoint: 10,
	willPerPoint: 5,
	itemPoints: 40,
	speed: 0.6,
	speedPerPoint: 0.1,
	defensePerPoint: 0.02,
	criticalPerPoint: 0.02,
	damage: -0.4,
	damagePerPoint: 0.1,
};

export default class ActorStateComponent implements Component {
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

	public constructor(entityId: number, initialData: any) {
		this.entityId = entityId;
		this.id = initialData.id;
		this.name = initialData.name;
		this.backstory = initialData.backstory;
		this.description = initialData.description;
		this.spriteUrl = initialData.spriteUrl;

		const initialMightValue = initialData.attributes.might;
		const initialImpulseValue = initialData.attributes.impulse;
		const initialGuileValue = initialData.attributes.guile;
		const initialHeartValue = initialData.attributes.heart;
		const initialLifeValue =
			BASE_ATTRIBUTES.lifePoints +
			BASE_ATTRIBUTES.lifePerPoint * initialMightValue;
		const initialWillValue =
			BASE_ATTRIBUTES.willPerPoint * initialHeartValue;
		const initialSpeedValue =
			BASE_ATTRIBUTES.speed +
			BASE_ATTRIBUTES.speedPerPoint * initialImpulseValue;
		const initialDefenseValue =
			BASE_ATTRIBUTES.defensePerPoint * initialImpulseValue;
		const initialCriticalValue =
			BASE_ATTRIBUTES.criticalPerPoint * initialGuileValue;

		this.attributes = {
			might: {
				baseValue: initialMightValue,
				maximumValue: initialMightValue,
				currentValue: initialMightValue,
			} as ActorAttribute,
			impulse: {
				baseValue: initialImpulseValue,
				maximumValue: initialImpulseValue,
				currentValue: initialImpulseValue,
			} as ActorAttribute,
			guile: {
				baseValue: initialGuileValue,
				maximumValue: initialGuileValue,
				currentValue: initialGuileValue,
			} as ActorAttribute,
			heart: {
				baseValue: initialHeartValue,
				maximumValue: initialHeartValue,
				currentValue: initialHeartValue,
			} as ActorAttribute,
			lifePoints: {
				baseValue: initialLifeValue,
				maximumValue: initialLifeValue,
				currentValue: initialLifeValue,
			} as ActorAttribute,
			willPoints: {
				baseValue: initialWillValue,
				maximumValue: initialWillValue,
				currentValue: initialWillValue,
			} as ActorAttribute,
			itemPoints: {
				baseValue: BASE_ATTRIBUTES.itemPoints,
				maximumValue: BASE_ATTRIBUTES.itemPoints,
				currentValue: BASE_ATTRIBUTES.itemPoints,
			} as ActorAttribute,
			speed: {
				baseValue: initialSpeedValue,
				maximumValue: initialSpeedValue,
				currentValue: initialSpeedValue,
			} as ActorAttribute,
			defense: {
				baseValue: initialDefenseValue,
				maximumValue: initialDefenseValue,
				currentValue: initialDefenseValue,
			} as ActorAttribute,
			critical: {
				baseValue: initialCriticalValue,
				maximumValue: initialCriticalValue,
				currentValue: initialCriticalValue,
			} as ActorAttribute,
			resist: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
			} as ActorAttribute,
			lifeRegen: {
				baseValue: 1,
				maximumValue: 1,
				currentValue: 1,
			} as ActorAttribute,
			willRegen: {
				baseValue: 1,
				maximumValue: 1,
				currentValue: 1,
			} as ActorAttribute,
			actionTimer: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
			} as ActorAttribute,
			lifeRegenTimer: {
				baseValue: BASE_LIFE_REGEN_TICKS,
				maximumValue: BASE_LIFE_REGEN_TICKS,
				currentValue: 0,
			} as ActorAttribute,
			willRegenTimer: {
				baseValue: BASE_WILL_REGEN_TICKS,
				maximumValue: BASE_WILL_REGEN_TICKS,
				currentValue: 0,
			} as ActorAttribute,
			willCostPerSecond: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
			} as ActorAttribute,
			willCostTimer: {
				baseValue: 1,
				maximumValue: 1,
				currentValue: 1,
			} as ActorAttribute,
		};

		const campaignState = container.resolve(CampaignState);
		// newActorData.affinityData = this.affinityData.get(initData.affinityId);

		this.powerData = initialData.abilityIds.map(
			async (powerDataId: string) => {
				const response = await fetch(
					`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/powers/${powerDataId}.json`,
				);
				const abData = await response.json();

				return abData as AbilityData;
			},
		);

		// newActorData.itemData = initData.itemIds.map((el: string) => {
		// 	return this.actionData.get(el);
		// });
		this.tactics = initialData.tactics;
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
	recoveryTime?: number;
	cost?: number;
	costAttribute?: string;
	itemId?: string;
	iconURL?: string;
	castVfxURL?: string;
	hitVfxURL?: string;
	castSfxURL?: string;
	hitSfxURL?: string;
}

export type EffectVariable =
	| string
	| number
	| boolean
	| string[]
	| number[]
	| EffectData[];

export interface EffectData {
	id: string;
	variables: {
		[index: string]: EffectVariable;
	};
}

export interface TacticsData {
	condition: TacticsCondition;
	actionType: AbilityDescriptor;
	actionIndex: number;
}

export enum AbilityTrigger {
	onActionPerform = "onActionPerform",
	onActorResistEffect = "onActorResistEffect",
	onActorInflictDamage = "onActorInflictDamage",
	onActorGrantHealing = "onActorGrantHealing",
	onActorLifeModify = "onActorLifeModify",
	onActorDefeat = "onActorDefeated",
	onActorRollCriticalHit = "onActorRollCriticalHit",
	onActorScoreCriticalHit = "onActorScoreCriticalHit",
}

export enum AbilityDescriptor {
	// Type
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
	// Type
	impact = "impact",
	lethal = "lethal",
	burn = "burn",
	toxic = "toxic",
	psychic = "psychic",
	// Type
	innate = "innate",
	weapon = "weapon",
	device = "device",
	mutation = "mutation",
	technique = "technique",
	invocation = "invocation",
	cybernetic = "cybernetic",
	// Form
	attack = "attack",
	action = "action",
	toggle = "toggle",
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
