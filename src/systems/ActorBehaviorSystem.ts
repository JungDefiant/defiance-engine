import { inject } from "tsyringe";
import { EntityId, query } from "bitecs";
import { GameScene } from "src/scenes/GameScene";
import {
    getActorBehaviorComponentArray,
    getActorNavigationComponentArray,
    getActorStateComponentArray,
} from "src/modules/ComponentModule";
import { getControlState, getGameplayState } from "src/modules/GameStateModule";
import {
    checkWithinQueuedActionRange,
    getActorRadius,
    getEffectiveActionRange,
    getTargetPosition,
    getTargetRadius,
    getTargetSlotPosition,
    releaseTargetSlot,
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
import { setActorTargetFromEntity } from "src/modules/TargetingModule";
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
import ActorNavigationComponent from "src/components/ActorNavigationComponent";

export default class ActorBehaviorSystem implements GameSystem {
    public constructor(@inject(GameScene) private gameScene: GameScene) {}

    public update(deltaTime: number): void {
        const controlState = getControlState();
        if (controlState.actionPauseSet.size > 0) {
            return;
        }

        const behaviorComponentArray = getActorBehaviorComponentArray();
        const actorStateComponentArray = getActorStateComponentArray();
        const actorNavigationComponentArray =
            getActorNavigationComponentArray();

        for (const entityId of query(this.gameScene.world, [
            behaviorComponentArray,
            actorStateComponentArray,
        ])) {
            const actorState = actorStateComponentArray[entityId];
            const actorBehavior = behaviorComponentArray[entityId];
            const actorNavigation = actorNavigationComponentArray[entityId];

            if (!actorState.queuedAction) {
                this.decideAction(actorState, actorBehavior);
            }

            if (actorState.queuedAction) {
                this.performAction(actorState, actorNavigation);
            }
        }
    }

    private performAction(
        actorState: ActorStateComponent,
        actorNavigation: ActorNavigationComponent,
    ): void {
        if (!this.checkValidTarget(actorState)) {
            releaseTargetSlot(actorState);
            actorState.queuedAction = null;
            return;
        }

        if (
            !checkWithinQueuedActionRange(actorState) &&
            !actorNavigation.destination
        ) {
            this.moveTowardTarget(actorState);
        }
    }

    private checkValidTarget(actorState: ActorStateComponent): boolean {
        const targetEntityId = actorState.currentTargetEntityId;
        if (!targetEntityId) {
            return false;
        }

        const targetActorState = getActorStateComponentArray()[targetEntityId];
        if (!targetActorState) {
            return false;
        }

        if (targetActorState.isDefeated) {
            return false;
        }

        const isInLineOfSight = hasLineOfSightToPosition(
            actorState.entityId,
            getTargetPosition(actorState) || Vector3.Zero(),
        );
        if (!isInLineOfSight) {
            return false;
        }

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
            releaseTargetSlot(actorState);
            actorState.queuedAction = null;
            return;
        }

        const effectiveActionRange = getEffectiveActionRange(
            actorState.queuedAction,
        );
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
            releaseTargetSlot(actorState);
            actorState.queuedAction = null;
            return;
        }

        trackQueuedActionTarget(actorState.entityId, targetPosition);
        this.navigateToTargetSlot(actorState, targetPosition);
    }

    private navigateToTargetSlot(
        actorState: ActorStateComponent,
        targetPosition: Vector3,
    ): void {
        const slotPosition = getTargetSlotPosition(actorState, targetPosition);
        if (!slotPosition) {
            navigateToPosition(actorState.entityId, targetPosition);
            return;
        }

        navigateToPosition(actorState.entityId, slotPosition);
    }
}
