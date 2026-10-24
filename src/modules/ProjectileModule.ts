import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import {
	getActorStateComponentArray,
	getProjectileComponentArray,
} from "./ComponentModule";
import { getActorCollisionRadius, getActorPosition } from "./Collision3DModule";
import ProjectileComponent from "src/components/ProjectileComponent";

export function getActorHomingDirection(
	targetEid: EntityId,
	fromPosition: Vector3,
): Nullable<Vector3> {
	const targetActorState = getActorStateComponentArray()[targetEid];
	const targetPosition = getActorPosition(targetEid);
	if (!targetActorState || targetActorState.isDefeated || !targetPosition) {
		return null;
	}
	const toTarget = targetPosition.subtract(fromPosition);
	toTarget.y = 0;
	if (toTarget.lengthSquared() < 0.0001) {
		return null;
	}
	return toTarget.normalize();
}

export function findProjectileHitActor(
	projectile: ProjectileComponent,
): EntityId {
	for (const eid of projectile.targetEids) {
		const targetActorState = getActorStateComponentArray()[eid];
		if (!targetActorState || targetActorState.isDefeated) {
			continue;
		}
		const targetPosition = getActorPosition(eid);
		if (!targetPosition) {
			continue;
		}
		const offsetFromTarget =
			projectile.mesh.position.subtract(targetPosition);
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
