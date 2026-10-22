import {
	AbstractMesh,
	Color3,
	Mesh,
	MeshBuilder,
	Nullable,
	StandardMaterial,
	Vector3,
} from "@babylonjs/core";
import { EntityId } from "bitecs";
import { AbilityData, AbilityTarget } from "src/types/AbilityTypes";
import { CollisionBehaviorData, TargetingShapeData } from "src/types/CollisionTypes";
import CollisionComponent from "src/components/CollisionComponent";
import {
	getActorStateComponentArray,
	getCollisionComponentArray,
	getComponentRegistry,
} from "./ComponentModule";
import { getGameScene, getGameplayState } from "./GameStateModule";
import { getActorNavigation } from "./ActorNavigationModule";
import { checkEventByTrigger } from "./EventModule";
import { applyActionEffects } from "./CombatModule";
import { clamp } from "./Utils";
import {
	ACTOR_GROUND_Y,
	ACTOR_SPRITE_VERTICAL_OFFSET,
} from "src/constants/GeneralConstants";
import { Themes } from "src/gui/Themes";
import type { GameEventTrigger } from "src/types/EventTypes";

const DEFAULT_COLLISION_RADIUS = 0.3;
const DEFAULT_PROJECTILE_RANGE = 20;
const DEFAULT_SPHERE_RADIUS = 2;
const DEFAULT_BEAM_RANGE = 10;
const DEFAULT_BEAM_RADIUS = 0.5;
const DEFAULT_CONE_RANGE = 5;
const DEFAULT_CONE_ANGLE = 90;

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

function getAimDirectionFromPointer(sourcePosition: Vector3): Vector3 {
	const gameScene = getGameScene();
	const aimDirection = new Vector3(0, 0, -1);

	if (gameScene.activeCamera) {
		const pickResult = gameScene.pick(
			gameScene.pointerX,
			gameScene.pointerY,
			(mesh) => !isExcludedFromAimPicking(mesh),
		);
		if (pickResult?.hit && pickResult.pickedPoint) {
			const pointerDirection = pickResult.pickedPoint.subtract(
				sourcePosition,
			);
			pointerDirection.y = 0;
			if (pointerDirection.lengthSquared() > 0.0001) {
				return pointerDirection.normalize();
			}
		}

		const cameraForward = gameScene.activeCamera.getForwardRay().direction;
		cameraForward.y = 0;
		if (cameraForward.lengthSquared() > 0.0001) {
			return cameraForward.normalize();
		}
	}

	return aimDirection;
}

function isExcludedFromAimPicking(mesh: AbstractMesh): boolean {
	return (
		mesh.name === "skybox" ||
		mesh.name === "targetHighlight" ||
		mesh.name.startsWith("pcSprite_") ||
		mesh.name.startsWith("enBattlerSprite_") ||
		mesh.name.startsWith("abilityProjectile_")
	);
}

function getTargetableActors(
	sourceEid: EntityId,
	actionData: AbilityData,
): EntityId[] {
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	const isSourcePlayer = gameplayState.playerEntityIds.includes(sourceEid);

	const wantsEnemies =
		actionData.target === AbilityTarget.singleEnemy ||
		actionData.target === AbilityTarget.groupEnemy;
	const wantsAllies =
		actionData.target === AbilityTarget.singleAlly ||
		actionData.target === AbilityTarget.groupAlly;

	let candidateEids: EntityId[] = [];
	if (wantsEnemies) {
		candidateEids = isSourcePlayer
			? gameplayState.enemyEntityIds
			: gameplayState.playerEntityIds;
	} else if (wantsAllies) {
		candidateEids = isSourcePlayer
			? gameplayState.playerEntityIds
			: gameplayState.enemyEntityIds;
	}

	return candidateEids.filter((eid) => {
		if (eid === sourceEid || !getActorPosition(eid)) {
			return false;
		}
		const actorState = actorStateComponentArray[eid];
		return actorState && !actorState.isDefeated;
	});
}

function distanceToSegment(
	point: Vector3,
	segmentStart: Vector3,
	segmentEnd: Vector3,
): number {
	const segment = segmentEnd.subtract(segmentStart);
	const segmentLengthSquared = segment.lengthSquared();
	if (segmentLengthSquared === 0) {
		return Vector3.Distance(point, segmentStart);
	}
	const projection = clamp(
		Vector3.Dot(point.subtract(segmentStart), segment) /
			segmentLengthSquared,
		0,
		1,
	);
	const closestPoint = segmentStart.add(segment.scale(projection));
	return Vector3.Distance(point, closestPoint);
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
		case "beam": {
			const range = shape.range ?? DEFAULT_BEAM_RANGE;
			const beamRadius = shape.radius ?? DEFAULT_BEAM_RADIUS;
			const beamStart = sourcePosition.add(
				aimDirection.scale(sourceRadius),
			);
			const beamEnd = sourcePosition.add(aimDirection.scale(range));
			for (const eid of candidates) {
				const targetPosition = getActorPosition(eid)!;
				if (
					distanceToSegment(targetPosition, beamStart, beamEnd) <=
					beamRadius + getActorCollisionRadius(eid)
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
			return (isSourcePlayer
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

const PROJECTILE_SPEED = 12;
const PROJECTILE_LENGTH = 0.35;
const PROJECTILE_WIDTH = 0.08;
const DEFAULT_PROJECTILE_RADIUS = 0.15;

interface AbilityProjectile {
	mesh: Mesh;
	direction: Vector3;
	speed: number;
	distanceTraveled: number;
	maxRange: number;
	radius: number;
	sourceEid: EntityId;
	actionData: AbilityData;
	targetEids: EntityId[];
}

const activeProjectiles: AbilityProjectile[] = [];

export function spawnAbilityProjectile(
	sourceEid: EntityId,
	actionData: AbilityData,
): void {
	const shape: TargetingShapeData | undefined = actionData.targetingShape;
	if (!shape || shape.type !== "projectile") {
		return;
	}

	const sourcePosition = getActorPosition(sourceEid);
	if (!sourcePosition) {
		return;
	}

	const selectedTargetEid = getSelectedTargetEid();
	let targetEids: EntityId[] = [];
	if (selectedTargetEid >= 0) {
		targetEids = [selectedTargetEid];
	} else {
		targetEids = getAbilityTargetsByShape(sourceEid, actionData);
	}

	let aimDirection: Nullable<Vector3> = null;
	if (targetEids.length > 0) {
		aimDirection = getActorHomingDirection(
			targetEids[0],
			sourcePosition,
		);
	}
	if (!aimDirection) {
		aimDirection = getAimDirectionFromPointer(sourcePosition);
	}

	createAbilityProjectile(
		sourceEid,
		actionData,
		aimDirection,
		shape.range ?? DEFAULT_PROJECTILE_RANGE,
		shape.radius ?? DEFAULT_PROJECTILE_RADIUS,
		targetEids,
	);
}

export function spawnActionDeliveryProjectile(
	sourceEid: EntityId,
	actionData: AbilityData,
	targetEids: EntityId[],
): void {
	if (targetEids.length === 0) {
		return;
	}

	const sourcePosition = getActorPosition(sourceEid);
	if (!sourcePosition) {
		return;
	}

	let aimDirection: Nullable<Vector3> = null;
	for (const targetEid of targetEids) {
		const targetActorState = getActorStateComponentArray()[targetEid];
		const targetPosition = getActorPosition(targetEid);
		if (
			!targetActorState ||
			targetActorState.isDefeated ||
			!targetPosition
		) {
			continue;
		}
		const toTarget = targetPosition.subtract(sourcePosition);
		toTarget.y = 0;
		if (toTarget.lengthSquared() > 0.0001) {
			aimDirection = toTarget.normalize();
			break;
		}
	}
	if (!aimDirection) {
		aimDirection = getAimDirectionFromPointer(sourcePosition);
	}

	const shape: TargetingShapeData | undefined = actionData.targetingShape;
	createAbilityProjectile(
		sourceEid,
		actionData,
		aimDirection,
		shape?.range ?? DEFAULT_PROJECTILE_RANGE,
		shape?.radius ?? DEFAULT_PROJECTILE_RADIUS,
		[...targetEids],
	);
}

function createAbilityProjectile(
	sourceEid: EntityId,
	actionData: AbilityData,
	direction: Vector3,
	maxRange: number,
	radius: number,
	targetEids: EntityId[],
): void {
	const gameScene = getGameScene();
	const sourcePosition = getActorPosition(sourceEid)!;

	const projectileMesh = MeshBuilder.CreateBox(
		`abilityProjectile_${sourceEid}_${activeProjectiles.length}`,
		{
			width: PROJECTILE_WIDTH,
			height: PROJECTILE_WIDTH,
			depth: PROJECTILE_LENGTH,
		},
		gameScene,
	);
	projectileMesh.rotation.y = Math.atan2(direction.x, direction.z);

	const projectileMaterial = new StandardMaterial(
		`mat_abilityProjectile_${sourceEid}_${activeProjectiles.length}`,
		gameScene,
	);
	projectileMaterial.diffuseColor = Color3.FromHexString("#EFC041");
	projectileMaterial.emissiveColor = Color3.FromHexString("#EFC041");
	projectileMaterial.disableLighting = true;
	projectileMesh.material = projectileMaterial;

	const spawnOffset = getActorCollisionRadius(sourceEid) + 0.3;
	projectileMesh.position.copyFrom(
		sourcePosition.add(direction.scale(spawnOffset)),
	);
	projectileMesh.position.y = ACTOR_GROUND_Y + ACTOR_SPRITE_VERTICAL_OFFSET;

	activeProjectiles.push({
		mesh: projectileMesh,
		direction: direction.clone(),
		speed: PROJECTILE_SPEED,
		distanceTraveled: 0,
		maxRange,
		radius,
		sourceEid,
		actionData,
		targetEids: [...targetEids],
	});
}

export function updateAbilityProjectiles(deltaTime: number): void {
	for (let i = activeProjectiles.length - 1; i >= 0; i--) {
		const projectile = activeProjectiles[i];

		let isFollowingLivingTarget = false;
		if (projectile.targetEids.length > 0) {
			let homingDirection: Nullable<Vector3> = null;
			for (const targetEid of projectile.targetEids) {
				homingDirection = getActorHomingDirection(
					targetEid,
					projectile.mesh.position,
				);
				if (homingDirection) {
					break;
				}
			}
			if (homingDirection) {
				isFollowingLivingTarget = true;
				projectile.direction.copyFrom(homingDirection);
				projectile.mesh.rotation.y = Math.atan2(
					homingDirection.x,
					homingDirection.z,
				);
			}
		}

		const distanceStep = projectile.speed * deltaTime;
		projectile.mesh.position.addInPlace(
			projectile.direction.scale(distanceStep),
		);
		projectile.mesh.position.y =
			ACTOR_GROUND_Y + ACTOR_SPRITE_VERTICAL_OFFSET;
		projectile.distanceTraveled += distanceStep;

		const hitEid = findProjectileHitActor(projectile);
		if (hitEid >= 0) {
			applyActionEffects(
				projectile.actionData,
				projectile.sourceEid,
				projectile.targetEids,
			);
			disposeProjectile(i);
			continue;
		}

		if (
			!isFollowingLivingTarget &&
			projectile.distanceTraveled >= projectile.maxRange
		) {
			disposeProjectile(i);
		}
	}
}

function getActorHomingDirection(
	targetEid: EntityId,
	fromPosition: Vector3,
): Nullable<Vector3> {
	const targetActorState = getActorStateComponentArray()[targetEid];
	const targetPosition = getActorPosition(targetEid);
	if (
		!targetActorState ||
		targetActorState.isDefeated ||
		!targetPosition
	) {
		return null;
	}
	const toTarget = targetPosition.subtract(fromPosition);
	toTarget.y = 0;
	if (toTarget.lengthSquared() < 0.0001) {
		return null;
	}
	return toTarget.normalize();
}

function getSelectedTargetEid(): EntityId {
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

function findProjectileHitActor(projectile: AbilityProjectile): EntityId {
	for (const eid of projectile.targetEids) {
		const targetActorState = getActorStateComponentArray()[eid];
		if (!targetActorState || targetActorState.isDefeated) {
			continue;
		}
		const targetPosition = getActorPosition(eid);
		if (!targetPosition) {
			continue;
		}
		const offsetFromTarget = projectile.mesh.position.subtract(
			targetPosition,
		);
		const horizontalDistance = Math.sqrt(
			offsetFromTarget.x * offsetFromTarget.x +
				offsetFromTarget.z * offsetFromTarget.z,
		);
		if (
			horizontalDistance <=
			projectile.radius + getActorCollisionRadius(eid)
		) {
			return eid;
		}
	}

	return -1;
}

function disposeProjectile(projectileIndex: number): void {
	const projectile = activeProjectiles[projectileIndex];
	projectile.mesh.material?.dispose();
	projectile.mesh.dispose();
	activeProjectiles.splice(projectileIndex, 1);
}

const TARGET_HIGHLIGHT_DIAMETER = 0.9;

let targetHighlightMesh: Nullable<Mesh> = null;

export function updateTargetHighlight(): void {
	const gameScene = getGameScene();
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();

	const targetEid = gameplayState.selectedTargetEID;
	const targetActorState =
		targetEid >= 0 ? actorStateComponentArray[targetEid] : undefined;
	const targetPosition = targetEid >= 0 ? getActorPosition(targetEid) : null;

	if (!targetActorState || targetActorState.isDefeated || !targetPosition) {
		if (targetHighlightMesh) {
			targetHighlightMesh.setEnabled(false);
		}
		return;
	}

	if (!targetHighlightMesh) {
		targetHighlightMesh = MeshBuilder.CreateTorus(
			"targetHighlight",
			{
				diameter: TARGET_HIGHLIGHT_DIAMETER,
				thickness: 0.04,
				tessellation: 24,
			},
			gameScene,
		);
		targetHighlightMesh.isPickable = false;

		const highlightMaterial = new StandardMaterial(
			"mat_targetHighlight",
			gameScene,
		);
		highlightMaterial.diffuseColor = Color3.FromHexString(
			Themes.secondary3,
		);
		highlightMaterial.emissiveColor = Color3.FromHexString(
			Themes.secondary3,
		);
		highlightMaterial.disableLighting = true;
		targetHighlightMesh.material = highlightMaterial;
	}

	targetHighlightMesh.setEnabled(true);
	targetHighlightMesh.position.copyFrom(targetPosition);
	targetHighlightMesh.position.y = ACTOR_GROUND_Y + 0.02;
}
