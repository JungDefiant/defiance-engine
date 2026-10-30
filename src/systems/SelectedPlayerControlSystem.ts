import { inject } from "tsyringe";
import { GameScene } from "src/scenes/GameScene";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";
import { queuePlayerAction } from "src/modules/CombatModule";
import { ActionSlotKey } from "src/types/AbilityTypes";
import GameSystem from "./GameSystem";
import { CombatState } from "src/types/CombatTypes";
import ActorStateComponent from "src/components/ActorStateComponent";

export default class SelectedPlayerControlSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        const gameplayState = getGameplayState();
        if (gameplayState.combatState !== CombatState.Active) {
            return;
        }

        const selectedEid = gameplayState.selectedPlayerEID;
        const actorStateComponentArray = getActorStateComponentArray();
        const selectedActorState = actorStateComponentArray[selectedEid];
        if (!selectedActorState || selectedActorState.isDefeated) {
            return;
        }

        if (selectedActorState.queuedAction) {
            return;
        }

        this.queueAutoAttack(selectedActorState);
    }

    private queueAutoAttack(selectedActorState: ActorStateComponent) {
        const gameplayState = getGameplayState();
        const actorStateComponentArray = getActorStateComponentArray();
        const selectedTargetEntityId = selectedActorState.currentTargetEntityId;
        if (
            selectedTargetEntityId < 0 ||
            !gameplayState.enemyEntityIds.includes(selectedTargetEntityId)
        ) {
            return;
        }

        const targetActorState =
            actorStateComponentArray[selectedTargetEntityId];
        if (!targetActorState || targetActorState.isDefeated) {
            return;
        }

        queuePlayerAction(selectedActorState.entityId, ActionSlotKey.weapon, 0);
    }
}
