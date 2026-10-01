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
	ActionSlotKey,
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
import { AbilityContext, AbilityTargetContext } from "src/types/ContextTypes";
import { ActionSlot } from "src/gui/abstract/ActionSlot";

const BASE_LIFE_REGEN_TICKS: number = 4;
const BASE_WILL_REGEN_TICKS: number = 4;
const BASE_ATTRIBUTES = {
	lifePoints: 60,
	lifePerPoint: 10,
	willPerPoint: 5,
	itemPoints: 40,
	speed: -0.4,
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
	weaponId: string;
	powerIds: string[];
	featIds: string[];
	itemIds?: string[];
	tactics?: TacticsData[];
}

export default class ActorStateComponent implements Component {
	entityId: EntityId;
	id: string = "";
	name: string = "";
	backstory: string = "";
	description: string = "";
	spriteUrl: string = "";
	attributes: AttributeSet = {};
	actionData: Map<ActionSlotKey, AbilityData[]> = new Map();
	featData: AbilityData[] = [];
	currentTargetEIDs: number[] = [];
	currentStatuses: EffectData[] = [];
	isPlayer: boolean = false;
	isDefeated: boolean = false;
	affinityData?: AffinityData;
	// equippedItemData?: ItemData[];
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
						descriptors: ["melee", "weapon"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialMightValue,
					},
					{
						descriptors: ["ranged", "weapon"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint *
							initialImpulseValue,
					},
					{
						descriptors: ["equipment", "power"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialGuileValue,
					},
					{
						descriptors: ["cybernetic", "power"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialGuileValue,
					},
					{
						descriptors: ["mutation", "power"],
						amount:
							BASE_ATTRIBUTES.offensePerPoint * initialHeartValue,
					},
					{
						descriptors: ["invocation", "power"],
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

		fetch(
			`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/weapons/${initialData.weaponId}.json`,
		)
			.then((response) => response.json())
			.then((weaponAbilityData) => {
				thisActorState.actionData.set(ActionSlotKey.weapon, [
					weaponAbilityData,
				]);
			});

		const allPowerPromises = Promise.all(
			initialData.powerIds.map((powerId) => {
				return fetch(
					`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/powers/${powerId}.json`,
				).then((response) => response.json());
			}),
		);

		allPowerPromises.then((allPowerData) => {
			allPowerData.forEach((powerData) => {
				let actionPowerData = thisActorState.actionData.get(
					ActionSlotKey.power,
				);
				if (!actionPowerData) {
					actionPowerData = [];
					thisActorState.actionData.set(
						ActionSlotKey.power,
						actionPowerData,
					);
				}

				actionPowerData.push(powerData);
			});
		});

		if (initialData.itemIds) {
			const allItemPromises = Promise.all(
				initialData.itemIds.map((itemId) => {
					return fetch(
						`${getPublicRoot()}/data/${campaignState.campaignId}/items/${itemId}.json`,
					).then((response) => response.json());
				}),
			);

			allItemPromises.then((allItemData) => {
				allItemData.forEach((itemData) => {
					// TO DO: Implement EquippedItemData interface during Inventory system build
					// thisActorState.equippedItemData.push(itemData);
				});
			});
		}

		const allFeatPromises = Promise.all(
			initialData.featIds.map((featId) => {
				return fetch(
					`${getPublicRoot()}/data/${campaignState.campaignId}/abilities/feats/${featId}.json`,
				).then((response) => response.json());
			}),
		);

		allFeatPromises.then((allFeatData) => {
			allFeatData.forEach((featData) => {
				thisActorState.featData.push(featData);
				if (featData.trigger === AbilityTrigger.alwaysActive) {
					const abilityContext = {
						target: `${featData.target}`,
						descriptors: featData.descriptors,
						effects: featData.effectData,
					} as AbilityContext;
					abilityContext.target = `${featData.target}`;
					abilityContext.descriptors = featData.descriptors;
					abilityContext.effects = featData.effectData;
					calculateAbilityEffects({
						source: this,
						target: this,
						abilityContext,
						abilityTargetIndex: 0,
					});
					applyAbilityEffects({
						source: this,
						target: this,
						abilityContext,
						abilityTargetIndex: 0,
					});
				}
			});
		});

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
	actionSlotKey: ActionSlotKey;
	actionIndex: number;
}

export enum TacticsCondition {
	random = "random",
	lowestLife = "lowestLife",
}
