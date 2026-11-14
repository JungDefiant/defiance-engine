import { inject } from "tsyringe";
import { EntityId, query } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import {
    getActorBehaviorComponentArray,
    getActorStateComponentArray,
} from "src/modules/ComponentModule";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import {
    checkWithinQueuedActionRange,
    getActorRadius,
    getTargetPosition,
    getTargetRadius,
    trackQueuedActionTarget,
} from "src/modules/ActorBehaviorModule";
import GameSystem from "./GameSystem";
import { CombatState } from "src/types/CombatTypes";
import { getActorBehaviorProcessor } from "src/modules/ProcessorModule";
import { AbilityData, LoadoutSlotKey } from "src/types/AbilityTypes";
import {
    getTargetBasedOnCondition,
    queueNPCAction,
} from "src/modules/CombatModule";
import {
    getActionRangeInMeters,
    setActorTargetFromEntity,
} from "src/modules/TargetingModule";
import {
    navigateToPosition,
    stopNavigation,
} from "src/modules/ActorNavigationModule";
import { ActorBehaviorFunctionProps } from "src/processors/ActorBehaviorProcessor";
import ActorStateComponent from "src/components/ActorStateComponent";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import { Vector3 } from "@babylonjs/core";
import {
    getActorPosition,
    hasLineOfSightToPosition,
} from "src/modules/Collision3DModule";
import { DEFAULT_ACTOR_COLLISION_RADIUS } from "src/constants/NavigationConstants";
import { cmToMeters } from "src/modules/Utils";

export default class ActorBehaviorSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        const behaviorComponentArray = getActorBehaviorComponentArray();
        const actorStateComponentArray = getActorStateComponentArray();

        for (const entityId of query(this.gameScene.world, [
            behaviorComponentArray,
            actorStateComponentArray,
        ])) {
            const actorState = actorStateComponentArray[entityId];
            const actorBehavior = behaviorComponentArray[entityId];

            if (!actorState.queuedAction) {
                this.decideAction(actorState, actorBehavior);
            }

            if (actorState.queuedAction) {
                this.performAction(actorState, actorBehavior);
            }
        }
    }

    private performAction(
        actorState: ActorStateComponent,
        actorBehavior: ActorBehaviorComponent,
    ): void {
        if (!this.checkValidTarget(actorState, actorBehavior)) {
            actorState.queuedAction = null;
            return;
        }

        if (!checkWithinQueuedActionRange(actorState)) {
            this.moveTowardTarget(actorState);
        }
    }

    private checkValidTarget(
        actorState: ActorStateComponent,
        actorBehavior: ActorBehaviorComponent,
    ): boolean {
        return true;
    }

    private decideAction(
        actorState: ActorStateComponent,
        actorBehavior: ActorBehaviorComponent,
    ): void {
        this.getBehaviorFunctionByTactic(actorState);

        if (!actorState.queuedAction) {
            const behaviorProcessor = getActorBehaviorProcessor();
            const behaviorFunction = behaviorProcessor.getProcessorFunction(
                actorBehavior.defaultBehavior,
            );
            behaviorFunction({
                actorState,
            } as ActorBehaviorFunctionProps);

            return;
        }
    }

    private async getBehaviorFunctionByTactic(actorState: ActorStateComponent) {
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

            const isActionValid = actionData.descriptors.includes(
                entry.actionType,
            );

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

    private moveTowardTarget(actorState: ActorStateComponent) {
        if (!actorState.queuedAction) {
            return;
        }

        const sourcePosition = getActorPosition(actorState.entityId);
        const targetPosition = getTargetPosition(actorState);
        if (!sourcePosition || !targetPosition) {
            stopNavigation(actorState.entityId);
            actorState.queuedAction = null;
            return;
        }

        const effectiveActionRange =
            getActionRangeInMeters(actorState.queuedAction) * 0.75;
        const isCurrentTargetInRange =
            Vector3.Distance(sourcePosition, targetPosition) <=
            effectiveActionRange + cmToMeters(DEFAULT_ACTOR_COLLISION_RADIUS);
        if (isCurrentTargetInRange) {
            stopNavigation(actorState.entityId);
            return;
        }

        const isInLineOfSight = hasLineOfSightToPosition(
            actorState.entityId,
            targetPosition,
        );
        if (!isInLineOfSight) {
            stopNavigation(actorState.entityId);
            actorState.queuedAction = null;
            return;
        }

        trackQueuedActionTarget(actorState.entityId, targetPosition);
        navigateToPosition(actorState.entityId, targetPosition);
    }
}
