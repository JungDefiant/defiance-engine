import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { AbilityData, AbilityTarget } from "src/types/AbilityTypes";
import { CollisionBehaviorData } from "src/types/CollisionTypes";
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
	DEFAULT_PROJECTILE_RANGE,
	DEFAULT_SPHERE_RADIUS,
} from "src/constants/CombatConstants";

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

export function getAbilityTargetsByShape(
	sourceEid: EntityId,
	actionData: AbilityData,
): EntityId[] {
	if (actionData.target === AbilityTarget.self) {
		return [sourceEid];
	}

	const sourcePosition = getActorPosition(sourceEid);
	if (!sourcePosition) {
		return [];
	}

	const shape = actionData.targetingShape;
	if (!shape) {
		return getAbilityTargetsByList(sourceEid, actionData);
	}

	const candidates = getTargetableActors(sourceEid, actionData);
	if (candidates.length === 0) {
		return [];
	}

	const aimDirection = getAimDirectionFromPointer(sourcePosition);
	const sourceRadius = getActorCollisionRadius(sourceEid);
	const matchedEids: EntityId[] = [];

	// Move this code to a processor
	switch (shape.type) {
		case "projectile": {
			const range = shape.range ?? DEFAULT_PROJECTILE_RANGE;
			let closestEid: EntityId = -1;
			let closestDistance = Infinity;
			for (const eid of candidates) {
				const targetPosition = getActorPosition(eid)!;
				const toTarget = targetPosition.subtract(sourcePosition);
				toTarget.y = 0;
				const projection = Vector3.Dot(toTarget, aimDirection);
				if (projection < 0 || projection > range) {
					continue;
				}
				const perpendicularDistance = toTarget
					.subtract(aimDirection.scale(projection))
					.length();
				const hitRadius =
					(shape.radius ?? DEFAULT_COLLISION_RADIUS) +
					getActorCollisionRadius(eid);
				if (
					perpendicularDistance <= hitRadius &&
					projection < closestDistance
				) {
					closestDistance = projection;
					closestEid = eid;
				}
			}
			if (closestEid >= 0) {
				matchedEids.push(closestEid);
			}
			break;
		}
		case "self": {
			const radius = shape.radius ?? DEFAULT_SPHERE_RADIUS;
			for (const eid of candidates) {
				const targetPosition = sourcePosition;
				if (
					Vector3.Distance(sourcePosition, targetPosition) <=
					radius + getActorCollisionRadius(eid)
				) {
					matchedEids.push(eid);
				}
			}
			break;
		}
		case "sphere": {
			const radius = shape.radius ?? DEFAULT_SPHERE_RADIUS;
			for (const eid of candidates) {
				const targetPosition = getActorPosition(eid)!;
				if (
					Vector3.Distance(sourcePosition, targetPosition) <=
					radius + getActorCollisionRadius(eid)
				) {
					matchedEids.push(eid);
				}
			}
			break;
		}
		case "cone": {
			const range = shape.range ?? DEFAULT_CONE_RANGE;
			const halfAngle =
				((shape.angle ?? DEFAULT_CONE_ANGLE) * (Math.PI / 180)) / 2;
			const coneStart = sourcePosition.add(
				aimDirection.scale(sourceRadius),
			);
			for (const eid of candidates) {
				const targetPosition = getActorPosition(eid)!;
				const toTarget = targetPosition.subtract(coneStart);
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
					matchedEids.push(eid);
				}
			}
			break;
		}
	}

	const isSingleTarget =
		actionData.target === AbilityTarget.singleEnemy ||
		actionData.target === AbilityTarget.singleAlly;
	if (isSingleTarget && matchedEids.length > 1) {
		return matchedEids.slice(0, 1);
	}

	return matchedEids;
}

function getAbilityTargetsByList(
	sourceEid: EntityId,
	actionData: AbilityData,
): EntityId[] {
	const gameplayState = getGameplayState();
	const isSourcePlayer = gameplayState.playerEntityIds.includes(sourceEid);

	switch (actionData.target) {
		case AbilityTarget.singleEnemy:
		case AbilityTarget.groupEnemy:
			return isSourcePlayer
				? gameplayState.enemyEntityIds
				: gameplayState.playerEntityIds;
		case AbilityTarget.singleAlly:
		case AbilityTarget.groupAlly:
			return (
				isSourcePlayer
					? gameplayState.playerEntityIds
					: gameplayState.enemyEntityIds
			).filter((eid) => eid !== sourceEid);
		default:
			return [];
	}
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

export function getSelectedTargetEid(): EntityId {
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	const selectedTargetEid = gameplayState.selectedTargetEID;
	if (selectedTargetEid < 0) {
		return -1;
	}
	const targetActorState = actorStateComponentArray[selectedTargetEid];
	if (
		!targetActorState ||
		targetActorState.isDefeated ||
		!gameplayState.enemyEntityIds.includes(selectedTargetEid)
	) {
		return -1;
	}
	return selectedTargetEid;
}
