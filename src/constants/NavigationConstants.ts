export const NAVMESH_LOAD_TIMEOUT_MS = 5000;
export const NAVMESH_POLL_INTERVAL_MS = 100;
export const NAV_AGENT_RADIUS = 0.4;
export const NAV_AGENT_HEIGHT = 1.6;
export const NAV_FACING_MIN_SPEED = 1;
export const NAV_CROWD_MAX_AGENTS = 48;
export const NAVMESH_GENERATOR_PARAMETERS = {
    cs: 0.2,
    ch: 0.2,
    tileSize: 128,
    maxObstacles: 0,
    walkableSlopeAngle: 45,
    walkableHeight: 1,
    walkableClimb: 1,
    walkableRadius: 2,
    walkableWaterLevel: 0,
    minRegionArea: 2,
    mergeRegionArea: 20,
    maxEdgeLen: 12,
    maxSimplificationError: 1.3,
    maxVertsPerPoly: 6,
    detailSampleDist: 6,
    detailSampleMaxError: 1,
};
export const NAV_ARRIVE_DISTANCE = 0.25;
export const ACTOR_SPACING_MARGIN = 0.05;
export const DEFAULT_ACTOR_COLLISION_RADIUS = 40;
export const TARGET_SLOT_COUNT = 8;
export const TARGET_SLOT_RING_RADIUS_M = 2;
export const NAV_AGENT_MAX_ACCELERATION = 24;
export const NAV_COLLISION_QUERY_RANGE_MULTIPLE = 8;
export const NAV_PATH_OPTIMIZATION_RANGE_MULTIPLE = 30;
export const NAV_DESTINATION_UPDATE_EPSILON = 0.5;
export const SEPARATION_ITERATIONS = 3;
export const SEPARATION_MAX_CORRECTION_SPEED = 4;
export const SEPARATION_RELAXATION = 0.6;
export const SEPARATION_TELEPORT_THRESHOLD = 1;
