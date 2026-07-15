import { RandomRange } from "@babylonjs/core";
import { EntityId, query } from "bitecs";
import { PAUSE_TACTICALPAUSE } from "src/Constants";
import { AbilityData, AbilityDescriptor, AbilityTarget, ActorData, TacticsCondition, TacticsData } from "src/components/ActorData";
import GameState from "src/states/GameState";
import { CombatState } from "src/systems/CombatManagerSystem";
import { container } from "tsyringe";

export function setTacticalPause(isActive: boolean, gameState: GameState) {
    if (isActive) {
        gameState.actionPauseSet.add(PAUSE_TACTICALPAUSE);
        gameState.renderPauseSet.add(PAUSE_TACTICALPAUSE);
    } else {
        gameState.actionPauseSet.delete(PAUSE_TACTICALPAUSE);
        gameState.renderPauseSet.delete(PAUSE_TACTICALPAUSE);
    }

    gameState.tacticalPauseScreen.showHide(isActive);
}

export function getTargetsBasedOnCondition(sourceData: ActorData, tacticEntry: TacticsData, gameState?: GameState, ): EntityId[] {
    if(!gameState) {
        gameState = container.resolve(GameState);
    }
    
    // Check if action matches tactic
    let actionData;
    if (tacticEntry.actionType === AbilityDescriptor.device) {
        actionData = sourceData.powerData[tacticEntry.actionIndex];
    } else if (sourceData.itemData && tacticEntry.actionType === AbilityDescriptor.power) {
        actionData = sourceData.itemData[tacticEntry.actionIndex];
    } else {
        return [];
    }

    // Check if ability condition is true
    switch (tacticEntry.condition) {
        case TacticsCondition.random:
            if (actionData.target === AbilityTarget.singleEnemy) {
                if (gameState.playerEIDs.includes(sourceData.entityId)) {
                    return [Math.round(RandomRange(0, gameState.enemyEIDs.length))]
                } else {
                    return [Math.round(RandomRange(0, gameState.playerEIDs.length))]
                }
            }
            else if (actionData.target === AbilityTarget.singleAlly) {
                if (gameState.enemyEIDs.includes(sourceData.entityId)) {
                    return [Math.round(RandomRange(0, gameState.enemyEIDs.length))]
                } else {
                    return [Math.round(RandomRange(0, gameState.playerEIDs.length))]
                }
            }

            break;
        case TacticsCondition.lowestLife:
            break;
    }

    return [];
}

export function resetTargeting(gameState: GameState) {
    for (const eid of query(gameState.world, [
        gameState.EnemyGUIComponent,
    ])) {
        const enemyGUI = gameState.EnemyGUIComponent[eid];
        enemyGUI.setVisibleTargetingUI(false);
        enemyGUI.setTargetingCallback(() => {});
    }
}

export function defeatActor(actor: ActorData) {
    const gameState = container.resolve(GameState);
    actor.isDefeated = true;

    // TO DO: Add code for defeating actor

    if (gameState.playerEIDs.includes(actor.entityId)) {
        for (let i = 0; i < gameState.playerEIDs.length; i++) {
            let eid = gameState.playerEIDs[i];
            let playerData = gameState.ActorDataComponent[eid];
            if (!playerData.isDefeated) {
                return;
            }
        }

        gameState.combatState = CombatState.Gameover;
    } else {
        for (let i = 0; i < gameState.enemyEIDs.length; i++) {
            let eid = gameState.enemyEIDs[i];
            let enemyData = gameState.ActorDataComponent[eid];
            if (!enemyData.isDefeated) {
                return CombatState.Default;
            }
        }

        gameState.combatState = CombatState.Victory;
    }
}
