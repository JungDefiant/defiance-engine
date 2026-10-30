import { Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import {
    DEFAULT_SPHERE_RADIUS,
    DEFAULT_CONE_RANGE,
    DEFAULT_CONE_ANGLE,
} from "src/constants/CombatConstants";
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
import { clamp } from "./Utils";

export function deliverActionEffectsByShape(
    sourceEntityId: EntityId,
    actionData: AbilityData,
    targetPosition?: Vector3,
    targetEntityId?: EntityId,
) {
    if (actionData.target === AbilityTarget.self) {
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
    } as TargetingShapeFunctionProps;

    return targetingShapeFunction(targetingShapeFunctionProps);
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

    const matchedEntityIds = [];
    const radius = props.shape.radius ?? DEFAULT_SPHERE_RADIUS;
    for (const entityId of props.candidates) {
        const targetPosition = getActorPosition(entityId);
        if (!targetPosition) {
            continue;
        }

        const radialDistance = radius + getActorCollisionRadius(entityId);

        if (
            Vector3.Distance(props.targetPosition, targetPosition) <=
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
    if (!props.targetPosition) {
        return;
    }

    getProjectileFactory().createEntityFromTargetingShapeProperties(props);
}

export function deliverAbilityEffectsByConeShape(
    props: TargetingShapeFunctionProps,
) {
    if (!props.targetPosition) {
        return;
    }

    const matchedEntityIds = [];
    const aimDirection = getAimDirectionFromPointer(props.targetPosition);
    const range = props.shape.range ?? DEFAULT_CONE_RANGE;
    const halfAngle =
        ((props.shape.angle ?? DEFAULT_CONE_ANGLE) * (Math.PI / 180)) / 2;
    for (const entityId of props.candidates) {
        const targetPosition = getActorPosition(entityId)!;
        const toTarget = targetPosition.subtract(props.targetPosition);
        toTarget.y = 0;
        const distance = toTarget.length();
        if (distance === 0 || distance > range) {
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
