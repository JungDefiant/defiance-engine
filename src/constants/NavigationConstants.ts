export const NAVMESH_LOAD_TIMEOUT_MS = 5000;
export const NAVMESH_POLL_INTERVAL_MS = 100;
export const NAV_AGENT_RADIUS = 0.3;
export const NAV_AGENT_HEIGHT = 0.8;
export const NAV_CROWD_MAX_AGENTS = 20;
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
export const NAV_ARRIVE_DISTANCE = 0.15;
export const ACTOR_SPACING_MARGIN = 0.05;
export const DEFAULT_ACTOR_COLLISION_RADIUS = 0.3;
