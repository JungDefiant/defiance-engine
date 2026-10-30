import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { AbilityData, AbilityTarget } from "src/types/AbilityTypes";
import {
    CollisionBehaviorData,
    TargetingShapeData,
} from "src/types/CollisionTypes";
import CollisionComponent from "src/components/CollisionComponent";
import {
    getActorStateComponentArray,
    getCollisionComponentArray,
    getComponentRegistry,
} from "./ComponentModule";
import { getGameplayState } from "./GameStateModule";
import { getActorNavigation } from "./ActorNavigationModule";
import { checkEventByTrigger } from "./EventModule";
import { clamp } from "./Utils";
import type { GameEventTrigger } from "src/types/EventTypes";
import {
    getAimDirectionFromPointer,
    getTargetableActors,
} from "./ControlModule";
import {
    DEFAULT_COLLISION_RADIUS,
    DEFAULT_CONE_ANGLE,
    DEFAULT_CONE_RANGE,
    DEFAULT_SPHERE_RADIUS,
} from "src/constants/CombatConstants";
import { getTargetingShapeProcessor } from "./ProcessorModule";
import { TargetingShapeFunctionProps } from "src/processors/TargetingShapeProcessor";
import { applyActionEffects } from "./CombatModule";
import { getProjectileFactory } from "./FactoryModule";

export function getActorPosition(entityId: EntityId): Nullable<Vector3> {
    const navigationComponent = getActorNavigation(entityId);
    if (!navigationComponent) {
        return null;
    }
    return navigationComponent.position;
}

export function getActorCollisionRadius(entityId: EntityId): number {
    const collisionComponent = getCollisionComponentArray()[entityId];
    return collisionComponent
        ? collisionComponent.radius
        : DEFAULT_COLLISION_RADIUS;
}

export function triggerCollisionBehaviors(
    sourceEid: EntityId,
    targetEid: EntityId,
): void {
    const collisionComponent = getCollisionComponentArray()[sourceEid];
    if (
        !collisionComponent ||
        collisionComponent.collisionBehaviors.length === 0
    ) {
        return;
    }

    const behaviors = collisionComponent.collisionBehaviors.filter(
        (behavior: CollisionBehaviorData) =>
            behavior.trigger === "OnCollisionEnter",
    );

    // Move to processor
    for (const behavior of behaviors) {
        switch (behavior.type) {
            case "Event":
                if (behavior.eventTrigger) {
                    checkEventByTrigger(
                        behavior.eventTrigger as GameEventTrigger,
                    );
                }
                break;
            case "Ability":
                break;
            case "Custom":
                if (behavior.customBehavior) {
                    behavior.customBehavior(sourceEid, targetEid);
                }
                break;
        }
    }
}

export function getCollisionComponentByEntityId(
    entityId: EntityId,
): Nullable<CollisionComponent> {
    return (
        getComponentRegistry().getComponentByEntityId<CollisionComponent>(
            CollisionComponent.name,
            entityId,
        ) ?? null
    );
}
