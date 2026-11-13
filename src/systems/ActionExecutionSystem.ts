import { inject } from "tsyringe";
import { query } from "bitecs";
import GameSystem from "src/systems/GameSystem";
import ActorStateComponent from "src/components/ActorStateComponent";
import {
    BASE_CASTTIME_MS,
    PAUSE_GAMEOVER,
} from "src/constants/GeneralConstants";
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
import {
    AbilityData,
    AbilityDescriptor,
    AbilityTrigger,
} from "src/types/AbilityTypes";
import { CombatState } from "src/types/CombatTypes";
import { deliverActionEffectsByShape } from "src/modules/TargetingModule";
import { sleep } from "src/modules/Utils";
import { Vector3 } from "@babylonjs/core";

export default class ActionExecutionSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const gameplayState = getGameplayState();
        const controlState = getControlState();
        const userInterfaceState = getUserInterfaceState();

        if (controlState.actionPauseSet.size > 0) {
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
            const recoveryTimerAttribute = actorState.attributes.recoveryTimer;
            const actionQueuedAction = actorState.queuedAction;

            if (
                !actionQueuedAction ||
                recoveryTimerAttribute.currentValue !==
                    recoveryTimerAttribute.maximumValue
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
                !actorState.isCastingAction &&
                actorState.queuedAction &&
                recoveryTimerAttribute.currentValue ===
                    recoveryTimerAttribute.maximumValue
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

        await this.castAction(sourceActorState, actionToPerform);

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

        sourceActorState.isCastingAction = false;

        const targetEntityId = sourceActorState.currentTargetEntityId;
        const targetPosition = sourceActorState.currentTargetPosition;
        const aimDirection = sourceActorState.currentAimDirection;

        deliverActionEffectsByShape(
            sourceActorState.entityId,
            actionToPerform,
            targetPosition,
            targetEntityId,
            aimDirection || Vector3.Zero(),
        );

        startRenderQueue();

        startActionRecovery(sourceActorState, actionToPerform);
    }

    private async castAction(
        sourceActorState: ActorStateComponent,
        actionToPerform: AbilityData,
    ) {
        sourceActorState.isCastingAction = true;

        const combatStateAtCastStart = getGameplayState().combatState;

        renderCastVFX(actionToPerform, sourceActorState.entityId);

        if (!actionToPerform.descriptors.includes(AbilityDescriptor.quick)) {
            // play casting animation
            await sleep(BASE_CASTTIME_MS);
        }

        if (getGameplayState().combatState !== combatStateAtCastStart) {
            sourceActorState.isCastingAction = false;
            return;
        }
    }
}
