import { Nullable, RandomRange, Vector3 } from "@babylonjs/core";
import { container } from "tsyringe";
import { EntityId, query, removeEntity } from "bitecs";
import {
    PAUSE_RENDERQUEUE,
    PAUSE_TACTICALPAUSE,
} from "src/constants/GeneralConstants";
import ActorStateComponent from "src/components/ActorStateComponent";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import {
    BASE_SPAWN_POSITION,
    COMBAT_ENEMY_SPAWN_Z_OFFSET,
    MINIMUM_RECOVERY,
    SPAWN_OFFSET,
    START_RECOVERY,
    START_RECOVERY_RANGE,
} from "src/constants/CombatConstants";
import {
    AbilityData,
    AbilityDescriptor,
    AbilityTarget,
    AbilityTrigger,
    LoadoutSlotKey,
    EffectFunctionProps,
} from "src/types/AbilityTypes";
import { ActorTactic, TacticCondition } from "src/types/BehaviorTypes";
import { AbilityContext } from "src/types/ContextTypes";
import {
    applyAbilityEffects,
    calculateAbilityEffects,
    calculateTotalAttributeValue,
    performAttackRoll,
} from "./EffectModule";
import {
    renderAbilityEffects,
    renderHitVFX,
    startRenderQueue,
} from "./RenderModule";
import { disposeEnemyEntities, resetPlayerActorState } from "./CharacterModule";
import { clearCombatHudEntries } from "./UserInterfaceModule";
import {
    getControlState,
    getGameplayState,
    getGameScene,
    getUserInterfaceState,
} from "./GameStateModule";
import { getEnemyFactory } from "./FactoryModule";
import {
    getActorStateComponentArray,
    getComponentRegistry,
} from "./ComponentModule";
import { setCombatGameMode, setExploreGameMode } from "./SceneModule";
import {
    clearActionPause,
    resetCombatModeActionManager,
} from "./ControlModule";
import { checkEventByTrigger } from "./EventModule";
import { CombatState } from "src/types/CombatTypes";
import { setActorTargetFromEntity } from "./TargetingModule";

export async function startCombat(encId: string): Promise<void> {
    const gameScene = getGameScene();
    const enemyFactory = getEnemyFactory();
    const controlState = getControlState();
    const gameplayState = getGameplayState();
    const actorStateComponentArray = getActorStateComponentArray();
    await setCombatGameMode();

    const encounter = gameScene.encounters[encId];

    gameplayState.combatState = CombatState.Active;

    for (let i = 0; i < encounter.length; i++) {
        const enId = encounter[i];
        const offsetVector = new Vector3(
            0,
            0,
            COMBAT_ENEMY_SPAWN_Z_OFFSET +
                (encounter.length - 1) * -SPAWN_OFFSET +
                i * SPAWN_OFFSET * 2,
        );
        const spawnPosition = BASE_SPAWN_POSITION.add(offsetVector);
        const newEnemy = await enemyFactory.createEntityFromFileAtPosition(
            enId,
            spawnPosition,
        );
        gameplayState.enemyEntityIds.push(newEnemy);
        const enActorData = actorStateComponentArray[newEnemy];
        enActorData.name = enActorData.name.concat(
            ` ${String.fromCharCode(65 + i)}`,
        );
        await decideNPCActionByTactic(enActorData);
    }

    resetCombatModeActionManager();

    for (const entityId of query(gameScene.world, [actorStateComponentArray])) {
        const actorData = actorStateComponentArray[entityId];
        const recoveryTimerAttribute = actorData.attributes.recoveryTimer;
        const initRange = Math.round(Math.random() * START_RECOVERY_RANGE);
        recoveryTimerAttribute.maximumValue = START_RECOVERY + initRange;
        recoveryTimerAttribute.currentValue = 0;
    }

    controlState.actionPauseSet.delete(PAUSE_RENDERQUEUE);

    checkEventByTrigger("OnCombatStart");
}

export function endCombat() {
    combatActionManager();
    clearCombatHudEntries();
    disposeEnemyEntities();
    resetPlayerActorState();
    clearActionPause();
    resetCombatStateToInactive();
    setExploreGameMode();
    checkEventByTrigger("OnCombatEnd");
}

function resetCombatStateToInactive() {
    const gameplayState = getGameplayState();
    gameplayState.combatState = CombatState.Inactive;
}

export function combatActionManager() {
    const controlState = getControlState();
    if (controlState.actionManager) {
        controlState.actionManager.dispose();
        controlState.actionManager = null;
    }
}

export function setTacticalPause(isActive: boolean) {
    const controlState = getControlState();
    const userInterfaceState = getUserInterfaceState();

    if (isActive) {
        controlState.actionPauseSet.add(PAUSE_TACTICALPAUSE);
        controlState.renderPauseSet.add(PAUSE_TACTICALPAUSE);
    } else {
        controlState.actionPauseSet.delete(PAUSE_TACTICALPAUSE);
        controlState.renderPauseSet.delete(PAUSE_TACTICALPAUSE);
    }

    userInterfaceState.tacticalPauseScreen.showHide(isActive);
}

export function getTargetBasedOnCondition(
    actionData: AbilityData,
    tacticEntry: ActorTactic,
    sourceEntityId: EntityId,
): EntityId {
    if (tacticEntry.condition === TacticCondition.random) {
        return getRandomTarget(actionData, sourceEntityId);
    } else if (tacticEntry.condition === TacticCondition.lowestLife) {
        return getLowestLifeTarget(actionData, sourceEntityId);
    }

    return -1;
}

export function getValidatedPlayerAction(
    eid: EntityId,
    actionSlotKey: LoadoutSlotKey,
): Nullable<AbilityData> {
    const gameplayState = getGameplayState();
    if (
        gameplayState.combatState === CombatState.Victory ||
        gameplayState.combatState === CombatState.Gameover
    ) {
        return null;
    }

    const actorState =
        getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
            ActorStateComponent.name,
            eid,
        ) as ActorStateComponent;
    if (!actorState) {
        return null;
    }
    const actionData = actorState.actionData.get(actionSlotKey) as AbilityData;
    if (!actionData || actionData.trigger != AbilityTrigger.onActionPerform) {
        return null;
    }

    const abilityCost = (actionData.cost as number) || 0;

    if (abilityCost > 0) {
        const costAttributeName = getCostAttributeName(
            actionData,
            actionSlotKey,
        );
        const costAttribute = actorState.attributes[costAttributeName];
        if (!costAttribute || costAttribute.currentValue < abilityCost) {
            return null;
        }
        actorState.queuedCostAttributeName = costAttributeName;
    }

    return actionData;
}

export function getCostAttributeName(
    actionData: AbilityData,
    slotKey: LoadoutSlotKey,
): string {
    let costAttributeName = (actionData.costAttribute as string) || "";
    if (costAttributeName === "ammo") {
        if (
            slotKey === LoadoutSlotKey.weapon1 ||
            slotKey === LoadoutSlotKey.weapon2
        ) {
            return "ammoWeapon";
        } else if (slotKey === LoadoutSlotKey.equipment1) {
            return "ammoEquip1";
        } else if (slotKey === LoadoutSlotKey.equipment2) {
            return "ammoEquip2";
        }
    }

    return costAttributeName;
}

export function queuePlayerAction(
    eid: EntityId,
    actionSlotKey: LoadoutSlotKey,
): void {
    const actorState =
        getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
            ActorStateComponent.name,
            eid,
        ) as ActorStateComponent;
    if (!actorState) {
        return;
    }

    const actionData = getValidatedPlayerAction(eid, actionSlotKey);
    if (!actionData) {
        return;
    }

    actorState.queuedAction = actionData;
}

export async function decideNPCActionByTactic(actorState: ActorStateComponent) {
    const tactics = actorState.tactics;

    if (!tactics) {
        return;
    }

    let decidedActionData: AbilityData | null = null;
    let decidedActionSlotKey: LoadoutSlotKey | null = null;

    for (const entry of tactics) {
        const actionData = actorState.actionData.get(
            entry.actionSlotKey,
        ) as AbilityData;
        if (!actionData) {
            continue;
        }

        const isActionValid = actionData.descriptors.includes(entry.actionType);

        if (!isActionValid) {
            continue;
        }

        const target = getTargetBasedOnCondition(
            actionData,
            entry,
            actorState.entityId,
        );

        if (target !== -1) {
            setActorTargetFromEntity(actorState, actionData, target);
            decidedActionData = actionData;
            decidedActionSlotKey = entry.actionSlotKey;
            break;
        }
    }

    if (decidedActionData && decidedActionSlotKey !== null) {
        queueNPCAction(
            decidedActionData,
            actorState.entityId,
            decidedActionSlotKey,
        );
    }
}

export function queueNPCAction(
    actionData: AbilityData,
    sourceEntityId: EntityId,
    actionSlotKey: LoadoutSlotKey,
): void {
    const sourceActorState =
        getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
            ActorStateComponent.name,
            sourceEntityId,
        );
    if (!sourceActorState) {
        return;
    }

    const abilityCost = (actionData.cost as number) || 0;

    if (abilityCost > 0) {
        const costAttributeName = getCostAttributeName(
            actionData,
            actionSlotKey,
        );
        const costAttribute = sourceActorState.attributes[costAttributeName];
        if (!costAttribute || costAttribute.currentValue < abilityCost) {
            return;
        }
        sourceActorState.queuedCostAttributeName = costAttributeName;
    }

    sourceActorState.queuedAction = actionData;
}

export function createNewAbilityContext(
    actionToPerform: AbilityData,
): AbilityContext {
    let abilityContext = {
        abilityName: actionToPerform.name,
        target: `${actionToPerform.target}`,
        descriptors: actionToPerform.descriptors,
        effects: actionToPerform.effectData,
        abilityTargetContexts: [],
        actionContext: {
            cost: actionToPerform.cost || 0,
            costAttribute: actionToPerform.costAttribute || "",
            recovery: actionToPerform.recovery || 0,
        },
    };

    return abilityContext;
}

export function applyActionEffects(
    actionData: AbilityData,
    sourceEntityId: EntityId,
    targetEntityId: EntityId,
): void {
    const actorStateComponentArray = getActorStateComponentArray();
    const sourceActorState = actorStateComponentArray[sourceEntityId];
    if (!sourceActorState) {
        return;
    }

    const abilityContext = createNewAbilityContext(actionData);

    const targetActorState = actorStateComponentArray[targetEntityId];
    if (!targetActorState || targetActorState.isDefeated) {
        return;
    }

    abilityContext.abilityTargetContexts[targetEntityId] = {};
    const effectProps = {
        source: sourceActorState,
        target: targetActorState,
        abilityContext,
        abilityTargetIndex: targetEntityId,
    } as EffectFunctionProps;

    if (hasActionAttackRoll(actionData.descriptors)) {
        performAttackRoll(effectProps);
    }
    calculateAbilityEffects(effectProps);
    applyAbilityEffects(effectProps);
    renderAbilityEffects(effectProps);
    renderHitVFX(actionData, [targetEntityId]);

    startRenderQueue();
}

export function startActionRecovery(
    sourceActorState: ActorStateComponent,
    actionData: AbilityData,
): void {
    if (getGameplayState().combatState !== CombatState.Active) {
        return;
    }

    const totalHasteValue = calculateTotalAttributeValue(
        sourceActorState.attributes.haste,
        actionData.descriptors,
    );
    const totalRecovery = Math.max(
        (actionData.recovery || MINIMUM_RECOVERY) - totalHasteValue,
        MINIMUM_RECOVERY,
    );
    const recoveryTimerAttribute = sourceActorState.attributes.recoveryTimer;
    recoveryTimerAttribute.maximumValue = totalRecovery;
    recoveryTimerAttribute.currentValue = 0;
}

function hasActionAttackRoll(actionDescriptors: AbilityDescriptor[]): boolean {
    return (
        (actionDescriptors.includes(AbilityDescriptor.attack) &&
            actionDescriptors.includes(AbilityDescriptor.ranged)) ||
        (actionDescriptors.includes(AbilityDescriptor.attack) &&
            actionDescriptors.includes(AbilityDescriptor.melee))
    );
}

export function defeatActor(actor: ActorStateComponent) {
    const gameplayState = getGameplayState();
    const componentRegistry = container.resolve(ComponentRegistry);

    actor.isDefeated = true;

    if (gameplayState.playerEntityIds.includes(actor.entityId)) {
        for (let i = 0; i < gameplayState.playerEntityIds.length; i++) {
            let eid = gameplayState.playerEntityIds[i];
            let playerData =
                componentRegistry.getComponentByEntityId<ActorStateComponent>(
                    ActorStateComponent.name,
                    eid,
                );
            if (!playerData.isDefeated) {
                return;
            }
        }

        gameplayState.combatState = CombatState.Gameover;
    } else {
        const enemyIndex = gameplayState.enemyEntityIds.indexOf(actor.entityId);
        if (enemyIndex >= 0) {
            gameplayState.enemyEntityIds.splice(enemyIndex, 1);
            removeEntity(getGameScene().world, actor.entityId);
        }

        for (let i = 0; i < gameplayState.enemyEntityIds.length; i++) {
            let eid = gameplayState.enemyEntityIds[i];
            let enemyData =
                componentRegistry.getComponentByEntityId<ActorStateComponent>(
                    ActorStateComponent.name,
                    eid,
                );
            if (!enemyData.isDefeated) {
                return;
            }
        }

        gameplayState.combatState = CombatState.Victory;
    }
}

export function getRandomTarget(
    actionData: AbilityData,
    sourceEid: EntityId,
): EntityId {
    let targetEntityId = getTargetEntityIdsByActionTargetType(
        actionData.target,
        sourceEid,
    );
    let rand = RandomRange(0, targetEntityId.length - 1);
    const targetEid = targetEntityId[Math.round(rand)];
    return targetEid;
}

export function getLowestLifeTarget(
    actionData: AbilityData,
    sourceEid: EntityId,
): EntityId {
    let targetEntityId = getTargetEntityIdsByActionTargetType(
        actionData.target,
        sourceEid,
    );
    let lowestLifeEntityId = -1;
    let lowestLifeValue = Infinity;

    const componentRegistry = container.resolve(ComponentRegistry);
    const actorStateComponentArray =
        componentRegistry.getComponentArrayByComponentId<ActorStateComponent>(
            ActorStateComponent.name,
        );

    targetEntityId.forEach((eid: EntityId) => {
        const currLife =
            actorStateComponentArray[eid].attributes.life.currentValue;
        if (currLife < lowestLifeValue) {
            lowestLifeEntityId = eid;
            lowestLifeValue = currLife;
        }
    });
    return lowestLifeEntityId;
}

export function getTargetEntityIdsByActionTargetType(
    abilityTarget: AbilityTarget,
    sourceEntityId: EntityId,
): EntityId[] {
    const gameplayState = getGameplayState();

    // Create different classes for different kinds of ability targets
    switch (abilityTarget) {
        case AbilityTarget.self:
            return [sourceEntityId];
        case AbilityTarget.ally:
            if (abilityTarget === AbilityTarget.ally) {
                return [];
            } else {
                if (gameplayState.playerEntityIds.includes(sourceEntityId)) {
                    return gameplayState.playerEntityIds;
                } else if (
                    gameplayState.enemyEntityIds.includes(sourceEntityId)
                ) {
                    return gameplayState.enemyEntityIds;
                }
            }
        case AbilityTarget.enemy:
            if (abilityTarget === AbilityTarget.enemy) {
                return [];
            } else {
                if (gameplayState.playerEntityIds.includes(sourceEntityId)) {
                    return gameplayState.enemyEntityIds;
                } else if (
                    gameplayState.enemyEntityIds.includes(sourceEntityId)
                ) {
                    return gameplayState.playerEntityIds;
                }
            }
        default:
            return [];
    }
}
