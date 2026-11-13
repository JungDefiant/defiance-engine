import { container } from "tsyringe";
import { EntityId } from "bitecs";
import { Nullable, Vector3 } from "@babylonjs/core";
import { getPublicRoot } from "src/modules/Utils";
import CampaignState from "src/states/CampaignState";
import { Component } from "./Component";
import {
    AbilityData,
    AbilityTrigger,
    LoadoutSlotKey,
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
import { AbilityContext } from "src/types/ContextTypes";
import { ActorTactic } from "src/types/BehaviorTypes";

const BASE_LIFE_REGEN_TICKS: number = 4;
const BASE_WILL_REGEN_TICKS: number = 4;
const BASE_ATTRIBUTES = {
    lifePoints: 80,
    lifePerPoint: 10,
    willPerPoint: 5,
    hastePerPoint: 5,
    defensePerPoint: 5,
    offensePerPoint: 5,
    speed: 300,
};

export interface LoadedActorJson {
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
    equipment1Id?: string;
    equipment2Id?: string;
    mutationId?: string;
    featIds: string[];
    tactics?: ActorTactic[];
}

export default class ActorStateComponent implements Component {
    entityId: EntityId;
    id: string = "";
    name: string = "";
    backstory: string = "";
    description: string = "";
    spriteUrl: string = "";
    attributes: AttributeSet = {};
    actionData: Map<LoadoutSlotKey, AbilityData> = new Map();
    featData: AbilityData[] = [];
    currentStatuses: EffectData[] = [];
    isPlayer: boolean = false;
    isDefeated: boolean = false;
    isCastingAction: boolean = false;
    affinityData?: AffinityData;
    // equippedItemData?: ItemData[];
    tactics?: ActorTactic[];
    queuedAction?: Nullable<AbilityData>;
    queuedCostAttributeName?: string;
    currentTargetEntityId?: EntityId;
    currentTargetPosition?: Vector3;
    currentAimDirection?: Nullable<Vector3>;

    public constructor(entityId: number, initialData: LoadedActorJson) {
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
        const initialHasteValue =
            BASE_ATTRIBUTES.hastePerPoint * initialImpulseValue;
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
            haste: {
                baseValue: initialHasteValue,
                maximumValue: initialHasteValue,
                currentValue: initialHasteValue,
                modifiers: [],
            } as ActorAttribute,
            offense: {
                baseValue: 0,
                maximumValue: 0,
                currentValue: 0,
                modifiers: [],
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
            speed: {
                baseValue: BASE_ATTRIBUTES.speed,
                maximumValue: BASE_ATTRIBUTES.speed,
                currentValue: BASE_ATTRIBUTES.speed,
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
            recoveryTimer: {
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
            ammoWeapon: {
                baseValue: 0,
                maximumValue: 0,
                currentValue: 0,
                modifiers: [],
            } as ActorAttribute,
            ammoEquip1: {
                baseValue: 0,
                maximumValue: 0,
                currentValue: 0,
                modifiers: [],
            } as ActorAttribute,
            ammoEquip2: {
                baseValue: 0,
                maximumValue: 0,
                currentValue: 0,
                modifiers: [],
            } as ActorAttribute,
        };

        const campaignState = container.resolve(CampaignState);
        const thisActorState = this;

        this.loadWeapon(initialData, thisActorState);
        this.loadMutation(initialData, thisActorState);
        this.loadEquipment(initialData, thisActorState);
        this.loadFeats(initialData, thisActorState);

        this.tactics = initialData.tactics;
    }

    private loadWeapon(initialData: LoadedActorJson, thisActorState: this) {
        Promise.all([]);
        fetch(
            `${getPublicRoot()}/data/abilities/weapons/${initialData.weaponId}.json`,
        )
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Failed to load weapon data "${initialData.weaponId}" (HTTP ${response.status})`,
                    );
                }
                return response.json();
            })
            .then(async (weaponData) => {
                const associatedAbilityData =
                    await this.loadWeaponAssociatedAbility(
                        weaponData.associatedAbility,
                    );
                thisActorState.actionData.set(
                    LoadoutSlotKey.weapon1,
                    weaponData,
                );

                thisActorState.actionData.set(
                    LoadoutSlotKey.weapon2,
                    associatedAbilityData,
                );

                if (weaponData.maxAmmo) {
                    thisActorState.attributes.ammoWeapon = {
                        baseValue: weaponData.maxAmmo,
                        maximumValue: weaponData.maxAmmo,
                        currentValue: weaponData.maxAmmo,
                        modifiers: [],
                    } as ActorAttribute;
                }
            })
            .catch((error) => console.error(error));
    }

    private loadWeaponAssociatedAbility(associatedAbilityId: string) {
        return fetch(
            `${getPublicRoot()}/data/abilities/powers/${associatedAbilityId}.json`,
        )
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Failed to load power data "${associatedAbilityId}" (HTTP ${response.status})`,
                    );
                }
                return response.json();
            })
            .then((weaponAbilityData) => {
                return weaponAbilityData;
            })
            .catch((error) => console.error(error));
    }

    private loadMutation(initialData: LoadedActorJson, thisActorState: this) {
        if (initialData.mutationId) {
            fetch(
                `${getPublicRoot()}/data/abilities/powers/${initialData.mutationId}.json`,
            )
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load power data "${initialData.mutationId}" (HTTP ${response.status})`,
                        );
                    }
                    return response.json();
                })
                .then((mutationAbilityData) => {
                    thisActorState.actionData.set(
                        LoadoutSlotKey.mutation,
                        mutationAbilityData,
                    );
                })
                .catch((error) => console.error(error));
        }
    }

    private loadEquipment(initialData: LoadedActorJson, thisActorState: this) {
        if (initialData.equipment1Id) {
            fetch(
                `${getPublicRoot()}/data/abilities/powers/${initialData.equipment1Id}.json`,
            )
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load power data "${initialData.equipment1Id}" (HTTP ${response.status})`,
                        );
                    }
                    return response.json();
                })
                .then((equipment1AbilityData) => {
                    thisActorState.actionData.set(
                        LoadoutSlotKey.equipment1,
                        equipment1AbilityData,
                    );
                })
                .catch((error) => console.error(error));
        }

        if (initialData.equipment2Id) {
            fetch(
                `${getPublicRoot()}/data/abilities/powers/${initialData.equipment2Id}.json`,
            )
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load power data "${initialData.equipment2Id}" (HTTP ${response.status})`,
                        );
                    }
                    return response.json();
                })
                .then((equipment2AbilityData) => {
                    thisActorState.actionData.set(
                        LoadoutSlotKey.equipment2,
                        equipment2AbilityData,
                    );
                })
                .catch((error) => console.error(error));
        }
    }

    private loadFeats(initialData: LoadedActorJson, thisActorState: this) {
        const allFeatPromises = Promise.all(
            initialData.featIds.map((featId) => {
                return fetch(
                    `${getPublicRoot()}/data/abilities/feats/${featId}.json`,
                ).then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to load feat data "${featId}" (HTTP ${response.status})`,
                        );
                    }
                    return response.json();
                });
            }),
        );

        allFeatPromises
            .then((allFeatData) => {
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
            })
            .catch((error) => console.error(error));
    }

    public getValue(): ActorStateComponent {
        return this;
    }

    public dispose(): void {}
}
