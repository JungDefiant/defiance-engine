import { AbstractMesh, Nullable, Ray, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { DefaultBehavior } from "src/types/BehaviorTypes";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import ActorStateComponent from "src/components/ActorStateComponent";
import { ActionSlotKey, AbilityData } from "src/types/AbilityTypes";
import {
	getActorBehaviorComponentArray,
	getActorStateComponentArray,
} from "./ComponentModule";
import { getGameplayState, getGameScene } from "./GameStateModule";
import { CombatState } from "src/systems/CombatManagerSystem";
import {
	decideNPCAction,
	queueNPCAction,
	startQueueActionPlayer,
} from "./CombatModule";
import { getActorPosition } from "./Collision3DModule";
import {
	getActorNavigation,
	navigateToPosition,
	stopNavigation,
} from "./ActorNavigationModule";

const PARTY_FORMATION_OFFSETS = [
	new Vector3(0, 0, 0),
	new Vector3(-0.9, 0, -0.9),
	new Vector3(0.9, 0, -0.9),
	new Vector3(0, 0, -1.8),
];
const FOLLOW_STOP_DISTANCE = 0.25;
const DEFAULT_WEAPON_RANGE = 1.5;
const WEAPON_RANGE_STOP_FACTOR = 0.9;
const LOS_RAY_HEIGHT = 0.4;
const LOS_BLOCKING_TOLERANCE = 0.1;

function rotateFormationOffsetAroundY(offset: Vector3, yaw: number): Vector3 {
	const cosYaw = Math.cos(yaw);
	const sinYaw = Math.sin(yaw);
	return new Vector3(
		offset.x * cosYaw + offset.z * sinYaw,
		offset.y,
		-offset.x * sinYaw + offset.z * cosYaw,
	);
}

export function getActorBehavior(
	entityId: EntityId,
): Nullable<ActorBehaviorComponent> {
	const behaviorComponent = getActorBehaviorComponentArray()[entityId];
	return behaviorComponent ?? null;
}

export function setPlayerControlledBehavior(selectedEid: EntityId) {
	const gameplayState = getGameplayState();
	const behaviorComponentArray = getActorBehaviorComponentArray();

	gameplayState.playerEntityIds.forEach((eid) => {
		const behaviorComponent = behaviorComponentArray[eid];
		if (!behaviorComponent) {
			return;
		}
		behaviorComponent.defaultBehavior =
			eid === selectedEid
				? DefaultBehavior.PlayerControlled
				: DefaultBehavior.Aggressive;
	});
}

export function updatePartyFollowFormation() {
	const gameplayState = getGameplayState();
	const leaderEid = gameplayState.selectedPlayerEID;
	const leaderNavigation = getActorNavigation(leaderEid);
	if (!leaderNavigation) {
		return;
	}
	const leaderPosition = leaderNavigation.position;

	const leaderFacing = leaderNavigation.facingDirection;
	const leaderYaw = Math.atan2(leaderFacing.x, leaderFacing.z);

	let formationSlot = 1;
	for (const eid of gameplayState.playerEntityIds) {
		if (eid === leaderEid) {
			continue;
		}

		const baseFormationOffset =
			formationSlot < PARTY_FORMATION_OFFSETS.length
				? PARTY_FORMATION_OFFSETS[formationSlot]
				: PARTY_FORMATION_OFFSETS[PARTY_FORMATION_OFFSETS.length - 1];
		const formationOffset = rotateFormationOffsetAroundY(
			baseFormationOffset,
			leaderYaw,
		);
		const followDestination = leaderPosition.add(formationOffset);

		const followerPosition = getActorPosition(eid);
		if (
			followerPosition &&
			Vector3.Distance(followerPosition, followDestination) <=
				FOLLOW_STOP_DISTANCE
		) {
			stopNavigation(eid);
		} else {
			navigateToPosition(eid, followDestination);
		}

		formationSlot++;
	}
}

export function updateSelectedPlayerAutoAttack() {
	const gameplayState = getGameplayState();
	if (gameplayState.combatState !== CombatState.Active) {
		return;
	}

	const selectedEid = gameplayState.selectedPlayerEID;
	const actorStateComponentArray = getActorStateComponentArray();
	const selectedActorState = actorStateComponentArray[selectedEid];
	if (!selectedActorState || selectedActorState.isDefeated) {
		return;
	}

	if (selectedActorState.queuedAction) {
		return;
	}

	const selectedTargetEid = gameplayState.selectedTargetEID;
	if (
		selectedTargetEid < 0 ||
		!gameplayState.enemyEntityIds.includes(selectedTargetEid)
	) {
		return;
	}
	const targetActorState = actorStateComponentArray[selectedTargetEid];
	if (!targetActorState || targetActorState.isDefeated) {
		return;
	}

	startQueueActionPlayer(selectedEid, ActionSlotKey.weapon, 0);
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
		behaviorComponent.defaultBehavior === DefaultBehavior.PlayerControlled
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

function queueDefaultAggressiveAction(
	entityId: EntityId,
	actorState: ActorStateComponent,
) {
	const weaponActionData = getWeaponActionData(actorState);
	if (!weaponActionData) {
		return;
	}

	const nearestTargetEids = getNearestOpposingActorEids(entityId);
	if (nearestTargetEids.length > 0) {
		queueNPCAction(weaponActionData, entityId, [nearestTargetEids[0]]);
	}
}

function getNearestOpposingActorEids(entityId: EntityId): EntityId[] {
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
	const nearestTargetEids = getNearestOpposingActorEids(entityId);
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
