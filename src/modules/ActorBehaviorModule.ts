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
import { queueNPCAction } from "./CombatModule";
import {
    getActorPosition,
    hasLineOfSightToPosition,
} from "./Collision3DModule";
import {
    getActionRangeInMeters,
    setActorTargetFromEntity,
} from "./TargetingModule";
import { getTargetableActors } from "./ControlModule";
import { ActorBehaviorFunctionProps } from "src/processors/ActorBehaviorProcessor";

export function getActorBehavior(
    entityId: EntityId,
): Nullable<ActorBehaviorComponent> {
    const behaviorComponent = getActorBehaviorComponentArray()[entityId];
    return behaviorComponent ?? null;
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
    if (props.actorState.queuedAction) {
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

export function checkWithinQueuedActionRange(actorState: ActorStateComponent) {
    const queuedAction = actorState.queuedAction;
    if (!queuedAction) {
        return;
    }

    const sourcePosition = getActorPosition(actorState.entityId);
    const currentTargetPosition = getTargetPosition(actorState);

    if (!sourcePosition || !currentTargetPosition) {
        return false;
    }

    const actionRange = getActionRangeInMeters(queuedAction);
    const isCurrentTargetInRange =
        Vector3.Distance(sourcePosition, currentTargetPosition) <= actionRange;
    const isInLineOfSight = hasLineOfSightToPosition(
        actorState.entityId,
        currentTargetPosition,
    );
    return isCurrentTargetInRange && isInLineOfSight;
}

function queueActionAgainstClosestTargetInRange(
    props: ActorBehaviorFunctionProps,
    weaponActionData: AbilityData,
): void {
    let targetEid = getClosestTargetInRangeEntityId(
        props.actorState.entityId,
        weaponActionData,
    );

    if (targetEid === -1) {
        return;
    }

    setActorTargetFromEntity(props.actorState, weaponActionData, targetEid);
    queueNPCAction(
        weaponActionData,
        props.actorState.entityId,
        LoadoutSlotKey.weapon1,
    );
}

function getClosestTargetInRangeEntityId(
    sourceEntityId: EntityId,
    actionData: AbilityData,
): EntityId {
    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return -1;
    }

    let closestEid: EntityId = -1;
    let closestDistance = Infinity;
    for (const eid of getTargetableActors(sourceEntityId, actionData)) {
        const targetPosition = getActorPosition(eid);
        if (!targetPosition) {
            continue;
        }

        const distance = Vector3.Distance(sourcePosition, targetPosition);
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

export function trackQueuedActionTarget(
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

export function getTargetPosition(
    actorState: ActorStateComponent,
): Nullable<Vector3> {
    const targetEntityId = actorState.currentTargetEntityId;
    if (targetEntityId !== undefined && targetEntityId >= 0) {
        return getActorPosition(targetEntityId);
    }
    return actorState.currentTargetPosition ?? null;
}

export function getActorRadius(entityId: EntityId): number {
    const actorState = getActorStateComponentArray()[entityId];
    return actorState.attributes.size.currentValue ?? 0;
}

export function getTargetRadius(actorState: ActorStateComponent): number {
    const targetEntityId = actorState.currentTargetEntityId;
    if (targetEntityId !== undefined && targetEntityId >= 0) {
        return getActorRadius(targetEntityId);
    }
    return 0;
}
