import { Vector3 } from "@babylonjs/core";

export const PARTY_FORMATION_OFFSETS = [
	new Vector3(0, 0, 0),
	new Vector3(-0.9, 0, -0.9),
	new Vector3(0.9, 0, -0.9),
	new Vector3(0, 0, -1.8),
];
export const FOLLOW_STOP_DISTANCE = 0.25;
export const DEFAULT_WEAPON_RANGE = 1.5;
export const WEAPON_RANGE_STOP_FACTOR = 0.9;
export const LOS_RAY_HEIGHT = 0.4;
export const LOS_BLOCKING_TOLERANCE = 0.1;
