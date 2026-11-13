import { Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import ActorStateComponent from "src/components/ActorStateComponent";
import {
    DEFAULT_SPHERE_RADIUS,
    DEFAULT_CONE_RANGE,
    DEFAULT_CONE_ANGLE,
} from "src/constants/CombatConstants";
import { DEFAULT_WEAPON_RANGE } from "src/constants/BehaviorConstants";
import { TargetingShapeFunctionProps } from "src/processors/TargetingShapeProcessor";
import { AbilityData, AbilityTarget } from "src/types/AbilityTypes";
import { getActorPosition, getActorCollisionRadius } from "./Collision3DModule";
import { applyActionEffects } from "./CombatModule";
import {
    getTargetableActors,
    getAimDirectionFromPointer,
} from "./ControlModule";
import { getProjectileFactory } from "./FactoryModule";
import { getGameplayState } from "./GameStateModule";
import { getTargetingShapeProcessor } from "./ProcessorModule";
import { clamp, cmToMeters } from "./Utils";

export function deliverActionEffectsByShape(
    sourceEntityId: EntityId,
    actionData: AbilityData,
    targetPosition?: Vector3,
    targetEntityId?: EntityId,
    aimDirection?: Vector3,
) {
    if (actionData.target === AbilityTarget.self) {
        applyActionEffects(actionData, sourceEntityId, sourceEntityId);
        return [sourceEntityId];
    }

    const sourcePosition = getActorPosition(sourceEntityId);
    if (!sourcePosition) {
        return;
    }

    const shape = actionData.targetingShape;
    if (!shape) {
        return;
    }

    const candidates = getTargetableActors(sourceEntityId, actionData);
    if (candidates.length === 0) {
        return;
    }

    const abilityTargetingShapeProcessor = getTargetingShapeProcessor();
    const targetingShapeFunction =
        abilityTargetingShapeProcessor.getProcessorFunction(shape.type);
    const targetingShapeFunctionProps = {
        sourceEntityId,
        action: actionData,
        shape,
        candidates,
        targetPosition,
        targetEntityId,
        aimDirection,
    } as TargetingShapeFunctionProps;

    return targetingShapeFunction(targetingShapeFunctionProps);
}

export function setActorTargetFromEntity(
    actorState: ActorStateComponent,
    actionData: AbilityData,
    targetEntityId: EntityId,
): void {
    const targetPosition = getActorPosition(targetEntityId);
    if (!targetPosition) {
        return;
    }

    actorState.currentTargetEntityId = targetEntityId;
    actorState.currentTargetPosition = targetPosition.clone();

    const targetingShapeType = actionData.targetingShape?.type;
    if (targetingShapeType !== "cone") {
        actorState.currentAimDirection = null;
        return;
    }

    const sourcePosition = getActorPosition(actorState.entityId);
    if (!sourcePosition) {
        return;
    }

    const aimDirection = targetPosition.subtract(sourcePosition);
    aimDirection.y = 0;
    if (aimDirection.lengthSquared() > 0.0001) {
        actorState.currentAimDirection = aimDirection.normalize();
    }
}

export function getActionRangeInMeters(actionData: AbilityData): number {
    const actionRange = actionData.targetingShape?.range;
    return cmToMeters(actionRange ?? DEFAULT_WEAPON_RANGE);
}

export function deliverAbilityEffectsDirectly(
    props: TargetingShapeFunctionProps,
) {
    if (!props.targetEntityId) {
        return;
    }

    applyActionEffects(
        props.action,
        props.sourceEntityId,
        props.targetEntityId,
    );
}

export function deliverAbilityEffectsByProjectile(
    props: TargetingShapeFunctionProps,
) {
    if (!props.targetEntityId) {
        return;
    }

    getProjectileFactory().createEntityFromTargetingShapeProperties(props);
}

export function deliverAbilityEffectsBySphere(
    props: TargetingShapeFunctionProps,
) {
    if (!props.targetPosition) {
        return;
    }

    deliverSphereEffectsAtPosition(props, props.targetPosition);
}

export function deliverAbilityEffectsBySphereAroundCaster(
    props: TargetingShapeFunctionProps,
) {
    const sourcePosition = getActorPosition(props.sourceEntityId);
    if (!sourcePosition) {
        return;
    }

    deliverSphereEffectsAtPosition(props, sourcePosition);
}

function deliverSphereEffectsAtPosition(
    props: TargetingShapeFunctionProps,
    centerPosition: Vector3,
) {
    const matchedEntityIds = [];
    const radius = cmToMeters(props.shape.radius ?? DEFAULT_SPHERE_RADIUS);
    for (const entityId of props.candidates) {
        const targetPosition = getActorPosition(entityId);
        if (!targetPosition) {
            continue;
        }

        const radialDistance = radius + getActorCollisionRadius(entityId);

        if (
            Vector3.Distance(centerPosition, targetPosition) <=
            radialDistance
        ) {
            matchedEntityIds.push(entityId);
        }
    }

    for (const entityId of matchedEntityIds) {
        applyActionEffects(props.action, props.sourceEntityId, entityId);
    }
}

export function deliverAbilityEffectsBySphereProjectile(
    props: TargetingShapeFunctionProps,
) {
    if (!props.targetEntityId) {
        return;
    }

    getProjectileFactory().createEntityFromTargetingShapeProperties(props);
}

export function deliverAbilityEffectsByConeShape(
    props: TargetingShapeFunctionProps,
) {
    const sourcePosition = getActorPosition(props.sourceEntityId);
    if (!sourcePosition) {
        return;
    }

    const aimDirection =
        props.aimDirection ?? getAimDirectionFromPointer(sourcePosition);
    const range = cmToMeters(props.shape.range ?? DEFAULT_CONE_RANGE);
    const halfAngle =
        ((props.shape.angle ?? DEFAULT_CONE_ANGLE) * (Math.PI / 180)) / 2;
    const matchedEntityIds = [];
    for (const entityId of props.candidates) {
        const targetPosition = getActorPosition(entityId);
        if (!targetPosition) {
            continue;
        }

        const toTarget = targetPosition.subtract(sourcePosition);
        toTarget.y = 0;
        const distance = toTarget.length();
        if (
            distance === 0 ||
            distance > range + getActorCollisionRadius(entityId)
        ) {
            continue;
        }
        const dot = clamp(
            Vector3.Dot(aimDirection, toTarget.normalize()),
            -1,
            1,
        );
        if (Math.acos(dot) <= halfAngle) {
            matchedEntityIds.push(entityId);
        }
    }

    for (const entityId of matchedEntityIds) {
        applyActionEffects(props.action, props.sourceEntityId, entityId);
    }
}

export function getAbilityTargetsByList(
    sourceEid: EntityId,
    actionData: AbilityData,
): EntityId[] {
    const gameplayState = getGameplayState();
    const isSourcePlayer = gameplayState.playerEntityIds.includes(sourceEid);

    switch (actionData.target) {
        case AbilityTarget.enemy:
            return isSourcePlayer
                ? gameplayState.enemyEntityIds
                : gameplayState.playerEntityIds;
        case AbilityTarget.ally:
            return (
                isSourcePlayer
                    ? gameplayState.playerEntityIds
                    : gameplayState.enemyEntityIds
            ).filter((eid) => eid !== sourceEid);
        default:
            return [];
    }
}
