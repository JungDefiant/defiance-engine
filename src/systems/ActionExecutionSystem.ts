import { inject } from "tsyringe";
import { query } from "bitecs";
import GameSystem from "src/systems/GameSystem";
import ActorStateComponent from "src/components/ActorStateComponent";
import { BASE_CAST_TIME_MS } from "src/constants/GeneralConstants";
import {
    createNewAbilityContext,
    startActionRecovery,
} from "src/modules/CombatModule";
import { triggerFeatEffects } from "src/modules/EffectModule";
import { renderCastVFX, startRenderQueue } from "src/modules/RenderModule";
import { GameScene } from "src/scenes/GameScene";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import { getActorStateComponentArray } from "src/modules/ComponentModule";
import {
    AbilityData,
    AbilityDescriptor,
    AbilityTrigger,
} from "src/types/AbilityTypes";
import { deliverActionEffectsByShape } from "src/modules/TargetingModule";
import { sleep } from "src/modules/Utils";
import { Vector3 } from "@babylonjs/core";
import { checkWithinQueuedActionRange } from "src/modules/ActorBehaviorModule";
import { stopNavigation } from "src/modules/ActorNavigationModule";

export default class ActionExecutionSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();

        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        this.queueActorAction();
    }

    private queueActorAction() {
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

            if (
                !actorState.isCastingAction &&
                actorState.queuedAction &&
                recoveryTimerAttribute.currentValue ===
                    recoveryTimerAttribute.maximumValue &&
                checkWithinQueuedActionRange(actorState)
            ) {
                if (
                    actionQueuedAction.cost &&
                    actionQueuedAction.costAttribute
                ) {
                    const isAbilityCostSpent = this.spendAbilityCost(
                        actorState,
                        actionQueuedAction,
                    );
                    if (!isAbilityCostSpent) {
                        continue;
                    }
                }
                Promise.resolve(
                    this.performQueuedAction(actorState)
                        .then(() => {
                            actorState.queuedAction = null;
                        })
                        .catch((error) => {
                            console.error(error);
                        }),
                );
                return;
            }
        }
    }

    private spendAbilityCost(
        source: ActorStateComponent,
        actionData: AbilityData,
    ): boolean {
        const abilityCost = (actionData.cost as number) || 0;
        const costAttributeName = source.queuedCostAttributeName || "";
        const costAttribute = source.attributes[costAttributeName];
        const isToggle = actionData.descriptors.includes(
            AbilityDescriptor.toggle,
        );

        if (!costAttribute || costAttribute.currentValue < abilityCost) {
            return false;
        }

        if (isToggle && costAttributeName === "willPoints") {
            source.attributes.willCostPerSecond.currentValue += abilityCost;
        } else {
            costAttribute.currentValue = Math.max(
                costAttribute.currentValue - abilityCost,
                0,
            );
        }
        return true;
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
        stopNavigation(sourceActorState.entityId);

        const combatStateAtCastStart = getGameplayState().combatState;

        renderCastVFX(actionToPerform, sourceActorState.entityId);

        if (!actionToPerform.descriptors.includes(AbilityDescriptor.quick)) {
            // play casting animation
            await sleep(BASE_CAST_TIME_MS);
        }

        if (getGameplayState().combatState !== combatStateAtCastStart) {
            sourceActorState.isCastingAction = false;
            return;
        }
    }
}
