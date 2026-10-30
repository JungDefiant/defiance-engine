import { inject } from "tsyringe";
import { query } from "bitecs";
import GameSystem from "src/systems/GameSystem";
import ActorStateComponent from "src/components/ActorStateComponent";
import { PAUSE_GAMEOVER } from "src/constants/GeneralConstants";
import {
    createNewAbilityContext,
    decideNPCActionByTactic,
    endCombat,
    startActionRecovery,
} from "src/modules/CombatModule";
import { spendAbilityCost, triggerFeatEffects } from "src/modules/EffectModule";
import { renderCastVFX, startRenderQueue } from "src/modules/RenderModule";
import { GameScene } from "src/scenes/GameScene";
import {
    getControlState,
    getGameplayState,
    getUserInterfaceState,
} from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";
import { AbilityTrigger } from "src/types/AbilityTypes";
import { CombatState } from "src/types/CombatTypes";
import { deliverActionEffectsByShape } from "src/modules/TargetingModule";

export default class ActionExecutionSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const gameplayState = getGameplayState();
        const controlState = getControlState();
        const userInterfaceState = getUserInterfaceState();

        if (
            gameplayState.combatState === CombatState.Inactive ||
            controlState.actionPauseSet.size > 0
        ) {
            return;
        }

        // Move to another system
        if (gameplayState.combatState === CombatState.Victory) {
            endCombat();
            return;
        }

        if (gameplayState.combatState === CombatState.Gameover) {
            controlState.actionPauseSet.add(PAUSE_GAMEOVER);
            userInterfaceState.gameOverScreen.showHide(true);
            return;
        }
        // END

        this.queueActorAction();
    }

    private queueActorAction() {
        const gameplayState = getGameplayState();
        const actorStateComponents = getActorStateComponentArray();

        for (const entityId of query(this.gameScene.world, [
            actorStateComponents,
        ])) {
            const actorState = actorStateComponents[entityId];
            const actionTimerAttribute = actorState.attributes.actionTimer;
            const actionQueuedAction = actorState.queuedAction;

            if (
                !actionQueuedAction ||
                actionTimerAttribute.currentValue !==
                    actionTimerAttribute.maximumValue
            ) {
                continue;
            }

            if (actionQueuedAction.cost && actionQueuedAction.costAttribute) {
                const isAbilityCostSpent = spendAbilityCost(
                    actorState,
                    actionQueuedAction,
                );
                if (!isAbilityCostSpent) {
                    continue;
                }
            }

            if (
                actorState.queuedAction &&
                actionTimerAttribute.currentValue ===
                    actionTimerAttribute.maximumValue
            ) {
                Promise.resolve(
                    this.performQueuedAction(actorState).then(() => {
                        // With behavior being handled in its own system and module, need to look into whether this is needed or not
                        if (gameplayState.playerEntityIds.includes(entityId)) {
                            actorState.queuedAction = null;
                        }
                        if (gameplayState.enemyEntityIds.includes(entityId)) {
                            Promise.resolve(
                                decideNPCActionByTactic(actorState),
                            );
                        }
                    }),
                );
                return;
            }
        }
    }

    private async performQueuedAction(
        sourceActorState: ActorStateComponent,
    ): Promise<void> {
        const actionToPerform = await sourceActorState.queuedAction;
        if (!actionToPerform) {
            return;
        }

        renderCastVFX(actionToPerform, sourceActorState.entityId);

        // Casting time here

        const abilityContext = createNewAbilityContext(actionToPerform);
        triggerFeatEffects(
            {
                source: sourceActorState,
                target: sourceActorState,
                abilityContext,
                abilityTargetIndex: 0,
            },
            AbilityTrigger.onActionPerform,
        );

        // Targeting here
        const targetEntityId = sourceActorState.currentTargetEntityId;
        const targetPosition = sourceActorState.currentTargetPosition;

        deliverActionEffectsByShape(
            sourceActorState.entityId,
            actionToPerform,
            targetPosition,
            targetEntityId,
        );

        startRenderQueue();

        startActionRecovery(sourceActorState, actionToPerform);
    }
}
