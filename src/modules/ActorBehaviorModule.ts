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
import { CombatState } from "src/systems/CombatManagerSystem";
import { decideNPCAction, queueNPCAction } from "./CombatModule";
import { getActorPosition } from "./Collision3DModule";
import { navigateToPosition, stopNavigation } from "./ActorNavigationModule";

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

	if (behaviorComponent.defaultBehavior === DefaultBehavior.Aggressive) {
		moveTowardNearestOpposingActor(entityId, actorState);
	}

	if (actorState.queuedAction) {
		return;
	}

	decideNPCAction(actorState);
	if (actorState.queuedAction) {
		return;
	}

	if (behaviorComponent.defaultBehavior === DefaultBehavior.Aggressive) {
		queueDefaultAggressiveAction(entityId, actorState);
	}
}

function getWeaponActionData(
	actorState: ActorStateComponent,
): AbilityData | undefined {
	const actionDataArray = actorState.actionData.get(ActionSlotKey.weapon);
	return actionDataArray?.[0] as AbilityData | undefined;
}

function getWeaponRange(actorState: ActorStateComponent): number {
	const weaponActionData = getWeaponActionData(actorState);
	const weaponRange = weaponActionData?.targetingShape?.range;
	return weaponRange ?? DEFAULT_WEAPON_RANGE;
}

export function queueDefaultPassiveAction(
	entityId: EntityId,
	actorState: ActorStateComponent,
) {
	const weaponActionData = getWeaponActionData(actorState);
	if (!weaponActionData) {
		return;
	}
}

export function queueDefaultAggressiveAction(
	entityId: EntityId,
	actorState: ActorStateComponent,
) {
	const weaponActionData = getWeaponActionData(actorState);
	if (!weaponActionData) {
		return;
	}

	const nearestTargetEids = getNearestOpposingActorEntityIds(entityId);
	if (nearestTargetEids.length > 0) {
		queueNPCAction(weaponActionData, entityId, [nearestTargetEids[0]]);
	}
}

export function queueDefaultDefensiveAction(
	entityId: EntityId,
	actorState: ActorStateComponent,
) {
	const weaponActionData = getWeaponActionData(actorState);
	if (!weaponActionData) {
		return;
	}
}

function getNearestOpposingActorEntityIds(entityId: EntityId): EntityId[] {
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	const isSourcePlayer = gameplayState.playerEntityIds.includes(entityId);
	const opposingEids = isSourcePlayer
		? gameplayState.enemyEntityIds
		: gameplayState.playerEntityIds;

	const sourcePosition = getActorPosition(entityId);
	if (!sourcePosition) {
		return [];
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

	return nearestEid >= 0 ? [nearestEid] : [];
}

function moveTowardNearestOpposingActor(
	entityId: EntityId,
	actorState: ActorStateComponent,
) {
	const nearestTargetEids = getNearestOpposingActorEntityIds(entityId);
	if (nearestTargetEids.length === 0) {
		stopNavigation(entityId);
		return;
	}

	const targetEid = nearestTargetEids[0];
	const targetPosition = getActorPosition(targetEid);
	const sourcePosition = getActorPosition(entityId);
	if (!targetPosition || !sourcePosition) {
		return;
	}

	const distanceToTarget = Vector3.Distance(sourcePosition, targetPosition);
	const isWithinWeaponRange =
		distanceToTarget <=
		getWeaponRange(actorState) * WEAPON_RANGE_STOP_FACTOR;
	const hasLineOfSight = hasLineOfSightToActor(entityId, targetEid);

	if (!isWithinWeaponRange || !hasLineOfSight) {
		navigateToPosition(entityId, targetPosition);
	} else {
		stopNavigation(entityId);
	}
}

function hasLineOfSightToActor(
	sourceEid: EntityId,
	targetEid: EntityId,
): boolean {
	const sourcePosition = getActorPosition(sourceEid);
	const targetPosition = getActorPosition(targetEid);
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
