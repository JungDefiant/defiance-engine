import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import { LoadoutSlotKey, AbilityData } from "src/types/AbilityTypes";
import {
    getActorBehaviorComponentArray,
    getActorStateComponentArray,
} from "./ComponentModule";
import { getGameplayState } from "./GameStateModule";
import { decideNPCActionByTactic, queueNPCAction } from "./CombatModule";
import {
    getActorPosition,
    hasLineOfSightToPosition,
} from "./Collision3DModule";
import {
    getActionRangeInMeters,
    setActorTargetFromEntity,
} from "./TargetingModule";
import { navigateToPosition, stopNavigation } from "./ActorNavigationModule";
import { getTargetableActors } from "./ControlModule";
import { CombatState } from "src/types/CombatTypes";
import { getActorBehaviorProcessor } from "./ProcessorModule";
import { ActorBehaviorFunctionProps } from "src/processors/BehaviorProcessor";

export function getActorBehavior(
    entityId: EntityId,
): Nullable<ActorBehaviorComponent> {
    const behaviorComponent = getActorBehaviorComponentArray()[entityId];
    return behaviorComponent ?? null;
}

// Break up this method into smaller methods, probably using a processor to gate the code that runs depending on the behavior
// How are tactics actually processed? The tactics should be processed before the behavior is processed.
export function decideActionByBehavior(entityId: EntityId) {
    const gameplayState = getGameplayState();
    if (gameplayState.combatState !== CombatState.Active) {
        return;
    }

    const behaviorComponent = getActorBehavior(entityId);
    const actorState = getActorStateComponentArray()[entityId];
    if (
        !behaviorComponent ||
        !actorState ||
        actorState.isDefeated ||
        entityId === gameplayState.selectedPlayerEID
    ) {
        return;
    }

    const actorBehaviorProcessor = getActorBehaviorProcessor();
    const behaviorFunction = actorBehaviorProcessor.getProcessorFunction(
        behaviorComponent.defaultBehavior,
    );
    const behaviorProps = {
        entityId,
        actorState,
    } as ActorBehaviorFunctionProps;

    // What the fuck is this? This needs to be fixed :/
    if (actorState.queuedAction) {
        behaviorFunction(behaviorProps);
        moveTowardTarget(entityId);
        return;
    }

    decideNPCActionByTactic(actorState);
    if (actorState.queuedAction) {
        moveTowardTarget(entityId);
        return;
    }

    behaviorFunction(behaviorProps);
    moveTowardTarget(entityId);
}

function getWeaponActionData(
    actorState: ActorStateComponent,
): Nullable<AbilityData> {
    if (!actorState.actionData) {
        return null;
    }

    return actorState.actionData.get(LoadoutSlotKey.weapon1) || null;
}

export function processDefaultPassiveBehavior(
    props: ActorBehaviorFunctionProps,
) {
    const weaponActionData = getWeaponActionData(props.actorState);
    if (!weaponActionData) {
        return;
    }
}

export function processDefaultAggressiveBehavior(
    props: ActorBehaviorFunctionProps,
) {
    // Simplify how actions are queued and requeued
    if (props.actorState.queuedAction) {
        retargetQueuedActionToClosestTargetInRange(props);
        return;
    }

    const weaponActionData = getWeaponActionData(props.actorState);
    if (!weaponActionData) {
        return;
    }

    queueActionAgainstClosestTargetInRange(props, weaponActionData);
}

export function processDefaultDefensiveBehavior(
    props: ActorBehaviorFunctionProps,
) {
    const weaponActionData = getWeaponActionData(props.actorState);
    if (!weaponActionData) {
        return;
    }
}

function retargetQueuedActionToClosestTargetInRange(
    props: ActorBehaviorFunctionProps,
): void {
    const queuedAction = props.actorState.queuedAction;
    if (!queuedAction) {
        return;
    }

    const sourcePosition = getActorPosition(props.entityId);
    const currentTargetPosition = getTargetPosition(props.actorState);
    if (!sourcePosition || !currentTargetPosition) {
        return;
    }

    const actionRange = getActionRangeInMeters(queuedAction);
    const isCurrentTargetInRange =
        Vector3.Distance(sourcePosition, currentTargetPosition) <=
            actionRange &&
        hasLineOfSightToPosition(props.entityId, currentTargetPosition);
    if (isCurrentTargetInRange) {
        return;
    }

    const nextTargetEid = getClosestTargetInRangeEntityId(
        props.entityId,
        queuedAction,
    );
    if (nextTargetEid === -1) {
        return;
    }

    setActorTargetFromEntity(props.actorState, queuedAction, nextTargetEid);
}

function queueActionAgainstClosestTargetInRange(
    props: ActorBehaviorFunctionProps,
    weaponActionData: AbilityData,
): void {
    let targetEid = getClosestTargetInRangeEntityId(
        props.entityId,
        weaponActionData,
    );
    if (targetEid === -1) {
        targetEid = getNearestOpposingActorEntityId(props.entityId);
    }
    if (targetEid === -1) {
        return;
    }

    setActorTargetFromEntity(props.actorState, weaponActionData, targetEid);
    queueNPCAction(
        weaponActionData,
        props.entityId,
        LoadoutSlotKey.weapon1,
    );
}

// Find a way to rework this logic; don't need another function getting the target
function getClosestTargetInRangeEntityId(
    sourceEntityId: EntityId,
    actionData: AbilityData,
): EntityId {
    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return -1;
    }

    const actionRange = getActionRangeInMeters(actionData);

    let closestEid: EntityId = -1;
    let closestDistance = Infinity;
    for (const eid of getTargetableActors(sourceEntityId, actionData)) {
        const targetPosition = getActorPosition(eid);
        if (!targetPosition) {
            continue;
        }

        const distance = Vector3.Distance(sourcePosition, targetPosition);
        if (distance > actionRange) {
            continue;
        }
        if (!hasLineOfSightToPosition(sourceEntityId, targetPosition)) {
            continue;
        }

        if (distance < closestDistance) {
            closestDistance = distance;
            closestEid = eid;
        }
    }

    return closestEid;
}

function getNearestOpposingActorEntityId(entityId: EntityId): EntityId {
    const gameplayState = getGameplayState();
    const actorStateComponentArray = getActorStateComponentArray();
    const isSourcePlayer = gameplayState.playerEntityIds.includes(entityId);
    const opposingEids = isSourcePlayer
        ? gameplayState.enemyEntityIds
        : gameplayState.playerEntityIds;

    const sourcePosition = getActorPosition(entityId);
    if (!sourcePosition) {
        return -1;
    }

    let nearestEid: EntityId = -1;
    let nearestDistance = Infinity;
    for (const eid of opposingEids) {
        const actorState = actorStateComponentArray[eid];
        const targetPosition = getActorPosition(eid);
        if (!actorState || actorState.isDefeated || !targetPosition) {
            continue;
        }
        const distance = Vector3.Distance(sourcePosition, targetPosition);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEid = eid;
        }
    }

    return nearestEid;
}

function moveTowardTarget(entityId: EntityId) {
    const actorStateComponentArray = getActorStateComponentArray();
    const actorState = actorStateComponentArray[entityId];
    const targetPosition = getTargetPosition(actorState);

    if (!targetPosition) {
        stopNavigation(entityId);
        return;
    }

    trackQueuedActionTarget(entityId, targetPosition);

    if (!isQueuedActionTargetOutOfReach(entityId, targetPosition)) {
        stopNavigation(entityId);
        return;
    }

    navigateToPosition(entityId, targetPosition);
}

function trackQueuedActionTarget(
    sourceEntityId: EntityId,
    targetPosition: Vector3,
): void {
    const actorStateComponentArray = getActorStateComponentArray();
    const actorState = actorStateComponentArray[sourceEntityId];
    if (!actorState.queuedAction) {
        return;
    }

    actorState.currentTargetPosition = targetPosition.clone();

    const targetingShapeType = actorState.queuedAction.targetingShape?.type;
    if (targetingShapeType !== "cone") {
        return;
    }

    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return;
    }

    const aimDirection = targetPosition.subtract(sourcePosition);
    aimDirection.y = 0;
    if (aimDirection.lengthSquared() > 0.0001) {
        actorState.currentAimDirection = aimDirection.normalize();
    }
}

function isQueuedActionTargetOutOfReach(
    sourceEntityId: EntityId,
    targetPosition: Vector3,
): boolean {
    const actorStateComponentArray = getActorStateComponentArray();
    const actorState = actorStateComponentArray[sourceEntityId];
    const queuedAction = actorState.queuedAction;
    if (!queuedAction) {
        return false;
    }

    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return false;
    }

    const actionRange = getActionRangeInMeters(queuedAction);
    const distanceToTarget = Vector3.Distance(sourcePosition, targetPosition);

    const isWithinActionRange = distanceToTarget <= actionRange;
    const hasLineOfSight = hasLineOfSightToPosition(
        sourceEntityId,
        targetPosition,
    );
    return !isWithinActionRange || !hasLineOfSight;
}

function getTargetPosition(actorState: ActorStateComponent): Nullable<Vector3> {
    const targetEntityId = actorState.currentTargetEntityId;
    if (targetEntityId !== undefined && targetEntityId >= 0) {
        return getActorPosition(targetEntityId);
    }
    return actorState.currentTargetPosition ?? null;
}
