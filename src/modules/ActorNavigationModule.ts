import {
	AbstractMesh,
	ICrowd,
	Mesh,
	Nullable,
	RecastJSPlugin,
	Scene,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { EntityId, addComponent, set } from "bitecs";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import { getActorNavigationComponentArray } from "./ComponentModule";
import { getGameScene } from "./GameStateModule";
import { BASE_MOVEMENT_SPEED } from "src/constants/GeneralConstants";
import type { EnvironmentObstacleData } from "src/types/CollisionTypes";

const NAVMESH_LOAD_TIMEOUT_MS = 5000;
const NAVMESH_POLL_INTERVAL_MS = 100;
const NAV_AGENT_RADIUS = 0.3;
const NAV_AGENT_HEIGHT = 0.8;
const NAV_CROWD_MAX_AGENTS = 20;
const NAVMESH_GENERATOR_PARAMETERS = {
	cs: 0.2,
	ch: 0.2,
	tileSize: 128,
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

let navigationPlugin: Nullable<RecastJSPlugin> = null;
let navigationCrowd: Nullable<ICrowd> = null;
let isInitializingNavMesh = false;

const navigationObstacles: EnvironmentObstacleData[] = [];

export function registerNavigationObstacle(
	obstacle: EnvironmentObstacleData,
): void {
	navigationObstacles.push(obstacle);
}

export function getNavigationObstacles(): EnvironmentObstacleData[] {
	return navigationObstacles;
}

export function isNavigationReady(): boolean {
	return navigationPlugin !== null;
}

export function getNavigationPlugin(): Nullable<RecastJSPlugin> {
	return navigationPlugin;
}

export function getNavigationCrowd(): Nullable<ICrowd> {
	return navigationCrowd;
}

function isExcludedFromNavMesh(mesh: AbstractMesh): boolean {
	return (
		mesh.name === "skybox" ||
		mesh.name === "targetHighlight" ||
		mesh.name.startsWith("pcSprite_") ||
		mesh.name.startsWith("enBattlerSprite_") ||
		mesh.name.startsWith("abilityProjectile_")
	);
}

async function waitForSceneMeshes(scene: Scene): Promise<Mesh[]> {
	const startTime = Date.now();
	while (Date.now() - startTime < NAVMESH_LOAD_TIMEOUT_MS) {
		const sceneMeshes = scene.meshes.filter(
			(mesh) => !isExcludedFromNavMesh(mesh),
		);
		if (sceneMeshes.length > 1) {
			return sceneMeshes as Mesh[];
		}
		await new Promise((resolve) =>
			setTimeout(resolve, NAVMESH_POLL_INTERVAL_MS),
		);
	}
	return scene.meshes.filter((mesh) => !isExcludedFromNavMesh(mesh)) as Mesh[];
}

export async function initNavigation(scene: Scene): Promise<void> {
	if (navigationPlugin || isInitializingNavMesh) {
		return;
	}
	isInitializingNavMesh = true;

	try {
		const globalScope = window as unknown as Record<string, unknown>;
		if (!globalScope.Recast) {
			const recastModuleName = "recast-navigation";
			const recastModule = (await import(
				/* @vite-ignore */ recastModuleName
			)) as Record<string, unknown>;
			globalScope.Recast =
				recastModule.Recast ?? recastModule.default ?? recastModule;
		}

		if (globalScope.Recast) {
			const navMeshMeshes = await waitForSceneMeshes(scene);
			const plugin = new RecastJSPlugin();
			plugin.createNavMesh(
				navMeshMeshes,
				NAVMESH_GENERATOR_PARAMETERS,
			);
			navigationPlugin = plugin;
			navigationCrowd = plugin.createCrowd(
				NAV_CROWD_MAX_AGENTS,
				NAV_AGENT_RADIUS,
				scene,
			);
		} else {
			console.warn(
				"No recast.js runtime found; falling back to direct steering navigation.",
			);
		}
	} catch (error) {
		console.warn(
			"Failed to initialize recast.js navigation; falling back to direct steering navigation.",
			error,
		);
	}

	isInitializingNavMesh = false;
}

export function createNavigationAgent(
	entityId: EntityId,
	position: Vector3,
	speed: number = BASE_MOVEMENT_SPEED,
): ActorNavigationComponent {
	const gameScene = getGameScene();
	const newNavigationComponent = new ActorNavigationComponent(
		entityId,
		position,
		speed,
	);
	addComponent(
		gameScene.world,
		entityId,
		set(getActorNavigationComponentArray(), newNavigationComponent),
	);

	if (navigationCrowd) {
		const agentParams = {
			radius: NAV_AGENT_RADIUS,
			height: NAV_AGENT_HEIGHT,
			maxSpeed: speed,
			maxAcceleration: 20,
			collisionQueryRange: 1,
			pathOptimizationRange: 2,
			separationWeight: 2,
		};
		const agentTransform = new TransformNode(
			`navAgent_${entityId}`,
			gameScene,
		);
		newNavigationComponent.agentIndex = navigationCrowd.addAgent(
			position,
			agentParams,
			agentTransform,
		);
	}

	return newNavigationComponent;
}

export function getActorNavigation(
	entityId: EntityId,
): Nullable<ActorNavigationComponent> {
	const navigationComponentArray = getActorNavigationComponentArray();
	const navigationComponent = navigationComponentArray[entityId];
	return navigationComponent ?? null;
}

export function navigateToPosition(
	entityId: EntityId,
	destination: Vector3,
	onDestinationReached?: () => void,
): void {
	const navigationComponent = getActorNavigation(entityId);
	if (!navigationComponent) {
		return;
	}

	navigationComponent.destination = destination.clone();
	navigationComponent.isNavigating = true;
	navigationComponent.onDestinationReachedEvent =
		onDestinationReached ?? null;

	if (navigationComponent.agentIndex >= 0 && navigationCrowd) {
		navigationCrowd.agentGoto(
			navigationComponent.agentIndex,
			destination,
		);
	}
}

export function stopNavigation(entityId: EntityId): void {
	const navigationComponent = getActorNavigation(entityId);
	if (!navigationComponent) {
		return;
	}

	navigationComponent.destination = null;
	navigationComponent.isNavigating = false;
	navigationComponent.onDestinationReachedEvent = null;

	if (navigationComponent.agentIndex >= 0 && navigationCrowd) {
		navigationCrowd.agentGoto(
			navigationComponent.agentIndex,
			navigationComponent.position,
		);
	}
}

export function teleportNavigationAgent(
	entityId: EntityId,
	position: Vector3,
): void {
	const navigationComponent = getActorNavigation(entityId);
	if (!navigationComponent) {
		return;
	}

	navigationComponent.position.copyFrom(position);

	if (navigationComponent.agentIndex >= 0 && navigationCrowd) {
		navigationCrowd.agentTeleport(
			navigationComponent.agentIndex,
			position,
		);
	}
}
