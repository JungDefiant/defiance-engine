import { Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";

export type TargetingRangeType =
	| "direct"
	| "projectile"
	| "self"
	| "sphere"
	| "cone";

export interface TargetingShapeData {
	type: TargetingRangeType;
	range?: number;
	radius?: number;
	angle?: number;
}

export type CollisionShapeType = "sphere";

export type CollisionBehaviorType = "Event" | "Ability" | "Custom";

export interface CollisionBehaviorData {
	trigger: string;
	type: CollisionBehaviorType;
	eventTrigger?: string;
	abilityId?: string;
	customBehavior?: (sourceEid: EntityId, targetEid: EntityId) => void;
}

export interface EnvironmentObstacleData {
	center: Vector3;
	halfExtents: Vector3;
	yaw: number;
}
