import { AbstractMesh, Nullable, Ray, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { CollisionBehaviorData } from "src/types/CollisionTypes";
import CollisionComponent from "src/components/CollisionComponent";
import {
    getCollisionComponentArray,
    getComponentRegistry,
} from "./ComponentModule";
import { getGameScene } from "./GameStateModule";
import { getActorNavigation } from "./ActorNavigationModule";
import { checkEventByTrigger } from "./EventModule";
import { cmToMeters } from "./Utils";
import type { GameEventTrigger } from "src/types/EventTypes";
import { DEFAULT_COLLISION_RADIUS } from "src/constants/CombatConstants";
import {
    LOS_BLOCKING_TOLERANCE,
    LOS_RAY_HEIGHT,
} from "src/constants/BehaviorConstants";

export function getActorPosition(entityId: EntityId): Nullable<Vector3> {
    const navigationComponent = getActorNavigation(entityId);
    if (!navigationComponent) {
        return null;
    }
    return navigationComponent.position;
}

export function getActorCollisionRadius(entityId: EntityId): number {
    const collisionComponent = getCollisionComponentArray()[entityId];
    const radius = collisionComponent
        ? collisionComponent.radius
        : DEFAULT_COLLISION_RADIUS;
    return cmToMeters(radius);
}

export function hasLineOfSightToPosition(
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
        mesh.name.startsWith("targetingPreview") ||
        mesh.name.startsWith("pcSprite_") ||
        mesh.name.startsWith("enBattlerSprite_") ||
        mesh.name.startsWith("abilityProjectile_")
    );
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
