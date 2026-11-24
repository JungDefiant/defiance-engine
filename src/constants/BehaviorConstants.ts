import { Vector3 } from "@babylonjs/core";

export const PARTY_FORMATION_OFFSETS = [
    new Vector3(-1.6, 0, -1.6),
    new Vector3(1.6, 0, -1.6),
    new Vector3(0, 0, -3.2),
];
export const FOLLOW_STOP_DISTANCE = 0.15;
export const FOLLOW_START_DISTANCE = 0.8;
export const DEFAULT_WEAPON_RANGE = 150;
export const WEAPON_RANGE_STOP_FACTOR = 0.9;
export const LOS_RAY_HEIGHT = 0.8;
export const LOS_BLOCKING_TOLERANCE = 0.1;
export const LOS_RANGE_LIMIT_CM = 2000;
