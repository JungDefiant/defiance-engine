import { AbstractMesh, Nullable, Ray, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { DefaultBehavior } from "src/types/BehaviorTypes";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import { ActionSlotKey, AbilityData } from "src/types/AbilityTypes";
import {
    DEFAULT_WEAPON_RANGE,
    LOS_BLOCKING_TOLERANCE,
    LOS_RAY_HEIGHT,
    WEAPON_RANGE_STOP_FACTOR,
} from "src/constants/BehaviorConstants";
import {
    getActorBehaviorComponentArray,
    getActorStateComponentArray,
} from "./ComponentModule";
import { getGameplayState, getGameScene } from "./GameStateModule";
import { decideNPCActionByTactic, queueNPCAction } from "./CombatModule";
import { getActorPosition } from "./Collision3DModule";
import { navigateToPosition, stopNavigation } from "./ActorNavigationModule";
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

    moveTowardTarget(entityId);

    if (actorState.queuedAction) {
        return;
    }

    decideNPCActionByTactic(actorState);
    if (actorState.queuedAction) {
        return;
    }

    const actorBehaviorProcessor = getActorBehaviorProcessor();
    const behaviorFunction = actorBehaviorProcessor.getProcessorFunction(
        behaviorComponent.defaultBehavior,
    );
    behaviorFunction({ entityId, actorState } as ActorBehaviorFunctionProps);
}

function getWeaponActionData(
    actorState: ActorStateComponent,
): Nullable<AbilityData> {
    if (!actorState.actionData) {
        return null;
    }

    const actionDataArray = actorState.actionData.get(ActionSlotKey.weapon);
    if (actionDataArray) {
        return actionDataArray[0];
    } else {
        return null;
    }
}

function getAbilityRange(ability: AbilityData): number {
    if (!ability || !ability.targetingShape) {
        return -1;
    }

    const actionRange = ability.targetingShape.range;
    return actionRange ?? DEFAULT_WEAPON_RANGE;
}

export function queueDefaultPassiveAction(props: ActorBehaviorFunctionProps) {
    const weaponActionData = getWeaponActionData(props.actorState);
    if (!weaponActionData) {
        return;
    }
}

export function queueDefaultAggressiveAction(
    props: ActorBehaviorFunctionProps,
) {
    const weaponActionData = getWeaponActionData(props.actorState);
    if (!weaponActionData) {
        return;
    }

    const nearestTargetEid = getNearestOpposingActorEntityId(props.entityId);
    if (nearestTargetEid === -1) {
        return;
    }

    const targetingShapeType = weaponActionData.targetingShape?.type;
    if (targetingShapeType === "direct" || "projectile") {
        props.actorState.currentTargetEntityId = nearestTargetEid;
    } else {
        const targetPosition = getActorPosition(nearestTargetEid);
        props.actorState.currentTargetPosition = targetPosition as Vector3;
    }

    queueNPCAction(weaponActionData, props.entityId);
}

export function queueDefaultDefensiveAction(props: ActorBehaviorFunctionProps) {
    const weaponActionData = getWeaponActionData(props.actorState);
    if (!weaponActionData) {
        return;
    }
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
    if (isTargetableWithQueuedAction(entityId)) {
        const targetPosition = getTargetPosition(actorState);
        if (targetPosition && targetPosition !== Vector3.Zero()) {
            navigateToPosition(entityId, targetPosition);
        }
    } else {
        stopNavigation(entityId);
    }
}

function isTargetableWithQueuedAction(sourceEntityId: EntityId) {
    const actorStateComponentArray = getActorStateComponentArray();
    const actorState = actorStateComponentArray[sourceEntityId];
    const queuedAction = actorState.queuedAction;
    if (!queuedAction) {
        return false;
    }

    const actionRange = getAbilityRange(queuedAction);
    if (!actionRange) {
        return false;
    }

    const targetPosition = getTargetPosition(actorState);
    const sourcePosition = getActorPosition(sourceEntityId);
    if (!targetPosition || !sourcePosition) {
        return false;
    }
    const distanceToTarget = Vector3.Distance(sourcePosition, targetPosition);

    const isWithinActionRange = distanceToTarget <= actionRange;
    const hasLineOfSight = hasLineOfSightToPosition(
        sourceEntityId,
        targetPosition,
    );
    return !isWithinActionRange || !hasLineOfSight;
}

function getTargetPosition(actorState: ActorStateComponent) {
    if (actorState.currentTargetPosition) {
        return actorState.currentTargetPosition;
    } else if (actorState.currentTargetEntityId) {
        return getActorPosition(actorState.currentTargetEntityId);
    }
    return Vector3.Zero();
}

function hasLineOfSightToPosition(
    sourceEid: EntityId,
    targetPosition: Vector3,
): boolean {
    const sourcePosition = getActorPosition(sourceEid);
    if (!sourcePosition || !targetPosition) {
        return false;
    }

    const rayOrigin = new Vector3(
        sourcePosition.x,
        sourcePosition.y + LOS_RAY_HEIGHT,
        sourcePosition.z,
    );
    const rayTarget = new Vector3(
        targetPosition.x,
        targetPosition.y + LOS_RAY_HEIGHT,
        targetPosition.z,
    );
    const rayDirection = rayTarget.subtract(rayOrigin);
    const rayLength = rayDirection.length();
    if (rayLength < 0.001) {
        return true;
    }
    rayDirection.normalize();

    const ray = new Ray(rayOrigin, rayDirection, rayLength);
    const pickResult = getGameScene().pickWithRay(
        ray,
        (mesh) => !isExcludedFromLineOfSight(mesh),
    );

    if (pickResult?.hit && pickResult.pickedPoint) {
        const obstacleDistance = Vector3.Distance(
            rayOrigin,
            pickResult.pickedPoint,
        );
        return obstacleDistance >= rayLength - LOS_BLOCKING_TOLERANCE;
    }

    return true;
}

function isExcludedFromLineOfSight(mesh: AbstractMesh): boolean {
    return (
        mesh.name === "skybox" ||
        mesh.name === "env_floor" ||
        mesh.name === "targetHighlight" ||
        mesh.name.startsWith("pcSprite_") ||
        mesh.name.startsWith("enBattlerSprite_") ||
        mesh.name.startsWith("abilityProjectile_")
    );
}
