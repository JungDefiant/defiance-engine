import { container } from "tsyringe";
import { EntityId } from "bitecs";
import { Nullable } from "@babylonjs/core";
import { getPublicRoot } from "src/modules/Utils";
import CampaignState from "src/states/CampaignState";
import { Component } from "./Component";
import {
	AbilityData,
	AbilityDescriptor,
	AbilityTrigger,
	EffectData,
} from "src/types/AbilityTypes";
import {
	ActorAttribute,
	AffinityData,
	AttributeSet,
} from "src/types/AttributeTypes";
import {
	applyAbilityEffects,
	calculateAbilityEffects,
} from "src/modules/EffectModule";
import { AbilityTargetContext } from "src/types/ContextTypes";

const BASE_LIFE_REGEN_TICKS: number = 4;
const BASE_WILL_REGEN_TICKS: number = 4;
const BASE_ATTRIBUTES = {
	lifePoints: 60,
	lifePerPoint: 10,
	willPerPoint: 5,
	itemPoints: 40,
	speed: 0.6,
	speedPerPoint: 0.1,
	defensePerPoint: 2,
	offensePerPoint: 2,
};

export interface LoadedAbilityJson {
	id: string;
	name: string;
	backstory: string;
	description: string;
	spriteUrl: string;
	attributes: {
		might: number;
		impulse: number;
		guile: number;
		heart: number;
	};
	powerIds: string[];
	featIds: string[];
	tactics: TacticsData[];
}

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

	public constructor(entityId: number, initialData: LoadedAbilityJson) {
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
			BASE_ATTRIBUTES.defensePerPoint * initialGuileValue;

		this.attributes = {
			might: {
				baseValue: initialMightValue,
				maximumValue: initialMightValue,
				currentValue: initialMightValue,
				modifiers: [],
			} as ActorAttribute,
			impulse: {
				baseValue: initialImpulseValue,
				maximumValue: initialImpulseValue,
				currentValue: initialImpulseValue,
				modifiers: [],
			} as ActorAttribute,
			guile: {
				baseValue: initialGuileValue,
				maximumValue: initialGuileValue,
				currentValue: initialGuileValue,
				modifiers: [],
			} as ActorAttribute,
			heart: {
				baseValue: initialHeartValue,
				maximumValue: initialHeartValue,
				currentValue: initialHeartValue,
				modifiers: [],
			} as ActorAttribute,
			lifePoints: {
				baseValue: initialLifeValue,
				maximumValue: initialLifeValue,
				currentValue: initialLifeValue,
				modifiers: [],
			} as ActorAttribute,
			willPoints: {
				baseValue: initialWillValue,
				maximumValue: initialWillValue,
				currentValue: initialWillValue,
				modifiers: [],
			} as ActorAttribute,
			itemPoints: {
				baseValue: BASE_ATTRIBUTES.itemPoints,
				maximumValue: BASE_ATTRIBUTES.itemPoints,
				currentValue: BASE_ATTRIBUTES.itemPoints,
				modifiers: [],
			} as ActorAttribute,
			speed: {
				baseValue: initialSpeedValue,
				maximumValue: initialSpeedValue,
				currentValue: initialSpeedValue,
				modifiers: [],
			} as ActorAttribute,
			offense: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
				modifiers: [
					{
						descriptors: ["melee", "attack"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialMightValue,
					},
					{
						descriptors: ["ranged", "attack"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint *
							initialImpulseValue,
					},
					{
						descriptors: ["device"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialGuileValue,
					},
					{
						descriptors: ["cybernetic"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialGuileValue,
					},
					{
						descriptors: ["mutation"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialHeartValue,
					},
					{
						descriptors: ["invocation"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialHeartValue,
					},
				],
			} as ActorAttribute,
			defense: {
				baseValue: initialDefenseValue,
				maximumValue: initialDefenseValue,
				currentValue: initialDefenseValue,
				modifiers: [],
			} as ActorAttribute,
			damage: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
				modifiers: [],
			} as ActorAttribute,
			resist: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
				modifiers: [],
			} as ActorAttribute,
			lifeRegen: {
				baseValue: 1,
				maximumValue: 1,
				currentValue: 1,
				modifiers: [],
			} as ActorAttribute,
			willRegen: {
				baseValue: 1,
				maximumValue: 1,
				currentValue: 1,
				modifiers: [],
			} as ActorAttribute,
			actionTimer: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
				modifiers: [],
			} as ActorAttribute,
			lifeRegenTimer: {
				baseValue: BASE_LIFE_REGEN_TICKS,
				maximumValue: BASE_LIFE_REGEN_TICKS,
				currentValue: 0,
				modifiers: [],
			} as ActorAttribute,
			willRegenTimer: {
				baseValue: BASE_WILL_REGEN_TICKS,
				maximumValue: BASE_WILL_REGEN_TICKS,
				currentValue: 0,
				modifiers: [],
			} as ActorAttribute,
			willCostPerSecond: {
				baseValue: 0,
				maximumValue: 0,
				currentValue: 0,
				modifiers: [],
			} as ActorAttribute,
			willCostTimer: {
				baseValue: 1,
				maximumValue: 1,
				currentValue: 1,
				modifiers: [],
			} as ActorAttribute,
		};

		const campaignState = container.resolve(CampaignState);
		const thisActorState = this;

		for (let i = 0; i < initialData.powerIds.length; i++) {
			const powerId = initialData.powerIds[i];
			fetch(
				`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/powers/${powerId}.json`,
			)
				.then((response) => {
					return response.json();
				})
				.then((abilityData) => {
					thisActorState.powerData.push(abilityData);
				});
		}

		for (let i = 0; i < initialData.featIds.length; i++) {
			const featId = initialData.featIds[i];
			fetch(
				`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/feats/${featId}.json`,
			)
				.then((response) => {
					return response.json();
				})
				.then((abilityData) => {
					thisActorState.featData.push(abilityData);
					if (abilityData.trigger === AbilityTrigger.alwaysActive) {
						const abilityContext = {
							target: `${abilityData.target}`,
							descriptors: abilityData.descriptors,
							effects: abilityData.effectData,
						} as AbilityTargetContext;
						abilityContext.target = `${abilityData.target}`;
						abilityContext.descriptors = abilityData.descriptors;
						abilityContext.effects = abilityData.effectData;
						calculateAbilityEffects(
							this,
							this,
							abilityData,
							abilityContext,
						);
						applyAbilityEffects(
							this,
							this,
							abilityData,
							abilityContext,
						);
					}
				});
		}

		this.tactics = initialData.tactics;
	}

	public getValue(): ActorStateComponent {
		return this;
	}

	public dispose(): void {}
}

export interface TacticsData {
	condition: TacticsCondition;
	actionType: AbilityDescriptor;
	actionIndex: number;
}

export enum TacticsCondition {
	random = "random",
	lowestLife = "lowestLife",
}
