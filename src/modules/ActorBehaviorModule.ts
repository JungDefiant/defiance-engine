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
import {
    TARGET_SLOT_COUNT,
    TARGET_SLOT_RING_RADIUS_M,
} from "src/constants/NavigationConstants";

interface TargetSlotSelection {
    targetEid: EntityId;
    slotIndex: Nullable<number>;
}

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

export function getEffectiveActionRange(actionData: AbilityData): number {
    return getActionRangeInMeters(actionData) * 0.75;
}

function queueActionAgainstClosestTargetInRange(
    props: ActorBehaviorFunctionProps,
    weaponActionData: AbilityData,
): void {
    const closestTarget = getClosestTargetInRangeEntityId(
        props.actorState.entityId,
        weaponActionData,
    );

    if (!closestTarget) {
        return;
    }

    setActorTargetFromEntity(
        props.actorState,
        weaponActionData,
        closestTarget.targetEid,
    );
    queueNPCAction(
        weaponActionData,
        props.actorState.entityId,
        LoadoutSlotKey.weapon1,
    );
    if (closestTarget.slotIndex === null) {
        return;
    }

    claimTargetSlot(
        props.actorState,
        closestTarget.targetEid,
        closestTarget.slotIndex,
    );
}

function getClosestTargetInRangeEntityId(
    sourceEntityId: EntityId,
    actionData: AbilityData,
): Nullable<TargetSlotSelection> {
    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return null;
    }

    let closestTarget: Nullable<TargetSlotSelection> = null;
    let closestDistance = Infinity;
    const isTargetSlotRequired = isTargetSlotClaimRequired(actionData);
    for (const eid of getTargetableActors(sourceEntityId, actionData)) {
        const targetPosition = getActorPosition(eid);
        if (!targetPosition) {
            continue;
        }

        const targetActorState = getActorStateComponentArray()[eid];
        if (!targetActorState) {
            continue;
        }

        const distance = Vector3.Distance(sourcePosition, targetPosition);
        if (!hasLineOfSightToPosition(sourceEntityId, targetPosition)) {
            continue;
        }

        let slotSelectionIndex: Nullable<number> = null;
        if (isTargetSlotRequired) {
            const freeSlotIndex = getFreeTargetSlotIndex(
                sourceEntityId,
                targetActorState,
                targetPosition,
                actionData,
            );
            if (freeSlotIndex === -1) {
                continue;
            }
            slotSelectionIndex = freeSlotIndex;
        }

        if (distance < closestDistance) {
            closestDistance = distance;
            closestTarget = {
                targetEid: eid,
                slotIndex: slotSelectionIndex,
            };
        }
    }

    return closestTarget;
}

function isTargetSlotClaimRequired(actionData: AbilityData): boolean {
    return getActionRangeInMeters(actionData) <= TARGET_SLOT_RING_RADIUS_M;
}

function getSlotRingRadius(actionData: AbilityData): number {
    const effectiveActionRange = getEffectiveActionRange(actionData);
    if (effectiveActionRange < TARGET_SLOT_RING_RADIUS_M) {
        return effectiveActionRange;
    }
    return TARGET_SLOT_RING_RADIUS_M;
}

function getSlotPosition(
    targetPosition: Vector3,
    slotIndex: number,
    ringRadius: number,
): Vector3 {
    const slotAngle = (slotIndex * Math.PI * 2) / TARGET_SLOT_COUNT;
    return new Vector3(
        targetPosition.x + Math.cos(slotAngle) * ringRadius,
        targetPosition.y,
        targetPosition.z + Math.sin(slotAngle) * ringRadius,
    );
}

export function getTargetSlotPosition(
    actorState: ActorStateComponent,
    fallbackTargetPosition: Vector3,
): Nullable<Vector3> {
    const queuedAction = actorState.queuedAction;
    const slotIndex = actorState.currentTargetSlotIndex;
    if (!queuedAction || slotIndex === null || slotIndex === undefined) {
        return null;
    }

    return getSlotPosition(
        fallbackTargetPosition,
        slotIndex,
        getSlotRingRadius(queuedAction),
    );
}

function isTargetSlotAvailable(
    sourceEntityId: EntityId,
    targetActorState: ActorStateComponent,
    slotIndex: number,
): boolean {
    const occupantEntityId = targetActorState.surroundSlotOccupants[slotIndex];
    if (occupantEntityId === -1 || occupantEntityId === sourceEntityId) {
        return true;
    }

    const occupantActorState = getActorStateComponentArray()[occupantEntityId];
    if (!occupantActorState || occupantActorState.isDefeated) {
        return true;
    }

    return (
        occupantActorState.currentTargetEntityId !== targetActorState.entityId
    );
}

function getFreeTargetSlotIndex(
    sourceEntityId: EntityId,
    targetActorState: ActorStateComponent,
    targetPosition: Vector3,
    actionData: AbilityData,
): number {
    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return -1;
    }

    const ringRadius = getSlotRingRadius(actionData);
    let closestSlotIndex = -1;
    let closestSlotDistance = Infinity;

    for (let slotIndex = 0; slotIndex < TARGET_SLOT_COUNT; slotIndex++) {
        if (
            !isTargetSlotAvailable(
                sourceEntityId,
                targetActorState,
                slotIndex,
            )
        ) {
            continue;
        }

        const slotPosition = getSlotPosition(
            targetPosition,
            slotIndex,
            ringRadius,
        );
        const slotDistance = Vector3.Distance(sourcePosition, slotPosition);
        if (slotDistance < closestSlotDistance) {
            closestSlotDistance = slotDistance;
            closestSlotIndex = slotIndex;
        }
    }

    return closestSlotIndex;
}

export function claimTargetSlot(
    actorState: ActorStateComponent,
    targetEntityId: EntityId,
    slotIndex: number,
): void {
    releaseTargetSlot(actorState);

    const targetActorState = getActorStateComponentArray()[targetEntityId];
    if (!targetActorState) {
        return;
    }

    targetActorState.surroundSlotOccupants[slotIndex] = actorState.entityId;
    actorState.currentTargetSlotIndex = slotIndex;
    actorState.currentTargetSlotTargetEid = targetEntityId;
}

export function releaseTargetSlot(actorState: ActorStateComponent): void {
    const slotIndex = actorState.currentTargetSlotIndex;
    const slotTargetEid = actorState.currentTargetSlotTargetEid;
    if (
        slotIndex === null ||
        slotIndex === undefined ||
        slotTargetEid === null
    ) {
        return;
    }

    const targetActorState = getActorStateComponentArray()[slotTargetEid];
    if (
        targetActorState &&
        targetActorState.surroundSlotOccupants[slotIndex] ===
            actorState.entityId
    ) {
        targetActorState.surroundSlotOccupants[slotIndex] = -1;
    }

    actorState.currentTargetSlotIndex = null;
    actorState.currentTargetSlotTargetEid = null;
}

export function releaseTargetSlots(actorState: ActorStateComponent): void {
    releaseTargetSlot(actorState);
    actorState.surroundSlotOccupants.fill(-1);
}

export function clearAllTargetSlots(): void {
    for (const actorState of getActorStateComponentArray()) {
        if (!actorState) {
            continue;
        }
        releaseTargetSlots(actorState);
    }
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
