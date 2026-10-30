import { RandomRange, Vector3 } from "@babylonjs/core";
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
    SPAWN_OFFSET,
    START_RECOVERY,
    START_RECOVERY_RANGE,
} from "src/constants/CombatConstants";
import {
    AbilityData,
    AbilityDescriptor,
    AbilityTarget,
    AbilityTrigger,
    ActionSlotKey,
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
import { renderAbilityEffects, startRenderQueue } from "./RenderModule";
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
import { getActorPosition } from "./Collision3DModule";

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
        const actionTimerAttribute = actorData.attributes.actionTimer;
        const initRange = Math.random() * START_RECOVERY_RANGE;
        actionTimerAttribute.maximumValue = START_RECOVERY + initRange;
        actionTimerAttribute.currentValue = 0;
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

export function queuePlayerAction(
    eid: EntityId,
    actionSlotKey: ActionSlotKey,
    index: number,
): void {
    const gameplayState = getGameplayState();
    if (gameplayState.combatState !== CombatState.Active) {
        return;
    }

    const actorState =
        getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
            ActorStateComponent.name,
            eid,
        ) as ActorStateComponent;
    if (!actorState) {
        return;
    }
    const actionDataArray = actorState.actionData.get(actionSlotKey);
    if (!actionDataArray) {
        return;
    }

    const actionData = actionDataArray[index] as AbilityData;
    if (!actionData || actionData.trigger != AbilityTrigger.onActionPerform) {
        return;
    }

    const abilityCost = (actionData.cost as number) || 0;
    const costAttributeName = (actionData.costAttribute as string) || "";
    if (abilityCost > 0) {
        const costAttribute = actorState.attributes[costAttributeName];
        if (!costAttribute || costAttribute.currentValue < abilityCost) {
            return;
        }
    }

    actorState.queuedAction = actionData;
}

export async function decideNPCActionByTactic(actorState: ActorStateComponent) {
    const tactics = actorState.tactics;

    if (!tactics) {
        return;
    }

    let decidedActionData;

    for (const entry of tactics) {
        const actionDataArray = actorState.actionData.get(entry.actionSlotKey);
        if (!actionDataArray) {
            continue;
        }

        const actionData = actionDataArray[entry.actionIndex];
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
            const targetingShapeType = actionData.targetingShape?.type;
            if (targetingShapeType === "direct" || "projectile") {
                actorState.currentTargetEntityId = target;
            } else {
                const targetPosition = getActorPosition(target);
                actorState.currentTargetPosition = targetPosition as Vector3;
            }

            decidedActionData = actionData;
            break;
        }
    }

    if (decidedActionData) {
        queueNPCAction(decidedActionData, actorState.entityId);
    }
}

export function queueNPCAction(
    actionData: AbilityData,
    sourceEntityId: EntityId,
): void {
    const sourceActorState =
        getComponentRegistry().getComponentByEntityId<ActorStateComponent>(
            ActorStateComponent.name,
            sourceEntityId,
        );
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
            recoveryTime: actionToPerform.recoveryTime || 0,
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

    startRenderQueue();
}

export function startActionRecovery(
    sourceActorState: ActorStateComponent,
    actionData: AbilityData,
): void {
    let recoveryTimeMultiplier = 1;
    const totalSpeedValue = calculateTotalAttributeValue(
        sourceActorState.attributes.speed,
        actionData.descriptors,
    );
    if (totalSpeedValue < 0) {
        recoveryTimeMultiplier = 1 + Math.abs(totalSpeedValue);
    } else {
        recoveryTimeMultiplier = 1 / (1 + totalSpeedValue);
    }
    const totalRecoveryTime =
        (actionData.recoveryTime || 0.5) * recoveryTimeMultiplier;
    const actionTimerAttribute = sourceActorState.attributes.actionTimer;
    actionTimerAttribute.maximumValue = Math.max(totalRecoveryTime, 0.5);
    actionTimerAttribute.currentValue = 0;
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
