import {
    AbstractMesh,
    IAgentParameters,
    ICrowd,
    Mesh,
    Nullable,
    Scene,
    TransformNode,
    Vector3,
} from "@babylonjs/core";
import {
    CreateNavigationPluginAsync,
    type RecastNavigationJSPluginV2,
} from "@babylonjs/addons";
import * as RecastNavigationCore from "recast-navigation";
import * as RecastNavigationGenerators from "recast-navigation/generators";
import { EntityId, addComponent, set } from "bitecs";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import {
    getActorNavigationComponentArray,
    getActorStateComponentArray,
    getCharacterSpriteComponentArray,
} from "./ComponentModule";
import {
    getGameScene,
    getGameStateRegistry,
    getNavigationState,
} from "./GameStateModule";
import {
    ACTOR_SPRITE_VERTICAL_OFFSET,
    BASE_MOVEMENT_SPEED,
} from "src/constants/GeneralConstants";
import { cmToMeters } from "./Utils";
import type { EnvironmentObstacleData } from "src/types/CollisionTypes";
import {
    NAV_AGENT_HEIGHT,
    NAV_AGENT_MAX_ACCELERATION,
    NAV_AGENT_RADIUS,
    NAV_COLLISION_QUERY_RANGE_MULTIPLE,
    NAV_CROWD_MAX_AGENTS,
    NAV_DESTINATION_UPDATE_EPSILON,
    NAV_PATH_OPTIMIZATION_RANGE_MULTIPLE,
    NAVMESH_GENERATOR_PARAMETERS,
    NAVMESH_LOAD_TIMEOUT_MS,
    NAVMESH_POLL_INTERVAL_MS,
} from "src/constants/NavigationConstants";
import NavigationState from "src/states/NavigationState";

export function registerNavigationObstacle(
    obstacle: EnvironmentObstacleData,
): void {
    getNavigationObstacles().push(obstacle);
}

export function getNavigationObstacles(): EnvironmentObstacleData[] {
    return getNavigationState().navigationObstacles;
}

export function isNavigationReady(): boolean {
    return getNavigationState().navigationPlugin !== null;
}

export function getNavigationPlugin(): Nullable<RecastNavigationJSPluginV2> {
    return getNavigationState().navigationPlugin;
}

export function getNavigationCrowd(): Nullable<ICrowd> {
    return getNavigationState().navigationCrowd;
}

export function syncActorWorldSprite(
    entityId: EntityId,
    navigationPosition: Vector3,
): void {
    const characterSprite = getCharacterSpriteComponentArray()[entityId];
    if (!characterSprite) {
        return;
    }

    characterSprite.getValue().position.copyFrom(navigationPosition);
    characterSprite.getValue().position.y =
        navigationPosition.y + ACTOR_SPRITE_VERTICAL_OFFSET;
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
    return scene.meshes.filter(
        (mesh) => !isExcludedFromNavMesh(mesh),
    ) as Mesh[];
}

export async function initNavigation(scene: Scene): Promise<void> {
    if (getNavigationState().isInitializingNavMesh) {
        return;
    }
    const previousNavigationState = getNavigationState();
    const newNavigationState = new NavigationState();
    newNavigationState.isInitializingNavMesh = true;
    newNavigationState.navigationObstacles.push(
        ...previousNavigationState.navigationObstacles,
    );

    try {
        await RecastNavigationCore.init();
        const navigationPlugin = await CreateNavigationPluginAsync({
            instance: {
                ...RecastNavigationCore,
                ...RecastNavigationGenerators,
            },
        });
        const navMeshMeshes = await waitForSceneMeshes(scene);
        navigationPlugin.createNavMesh(
            navMeshMeshes,
            NAVMESH_GENERATOR_PARAMETERS,
        );
        newNavigationState.navigationCrowd = navigationPlugin.createCrowd(
            NAV_CROWD_MAX_AGENTS,
            NAV_AGENT_RADIUS,
            scene,
        );
        newNavigationState.navigationPlugin = navigationPlugin;
        getGameStateRegistry().registerNewGameState(
            NavigationState.name,
            newNavigationState,
        );
    } catch (error) {
        console.warn(
            "Failed to initialize recast.js navigation; falling back to direct steering navigation.",
            error,
        );
    }

    newNavigationState.isInitializingNavMesh = false;
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

    return newNavigationComponent;
}

export function getDefaultNavigationAgentParams(
    speed: number,
): IAgentParameters {
    return {
        radius: NAV_AGENT_RADIUS,
        height: NAV_AGENT_HEIGHT,
        maxSpeed: cmToMeters(speed),
        maxAcceleration: NAV_AGENT_MAX_ACCELERATION,
        collisionQueryRange:
            NAV_AGENT_RADIUS * NAV_COLLISION_QUERY_RANGE_MULTIPLE,
        pathOptimizationRange:
            NAV_AGENT_RADIUS * NAV_PATH_OPTIMIZATION_RANGE_MULTIPLE,
        separationWeight: 2,
    };
}

function addNavigationAgent(
    navigationComponent: ActorNavigationComponent,
): void {
    const navigationCrowd = getNavigationCrowd();
    if (!navigationCrowd || navigationComponent.agentIndex >= 0) {
        return;
    }

    const agentParams = getDefaultNavigationAgentParams(
        navigationComponent.speed,
    );
    const agentTransform = new TransformNode(
        `navAgent_${navigationComponent.entityId}`,
        getGameScene(),
    );
    navigationComponent.agentTransformNode = agentTransform;
    navigationComponent.agentIndex = navigationCrowd.addAgent(
        navigationComponent.position,
        agentParams,
        agentTransform,
    );
}

export function removeNavigationAgent(entityId: EntityId): void {
    const navigationComponent = getActorNavigation(entityId);
    if (!navigationComponent) {
        return;
    }

    navigationComponent.isCollisionBlocked = false;

    if (navigationComponent.agentIndex < 0) {
        return;
    }

    const navigationCrowd = getNavigationCrowd();
    if (navigationCrowd) {
        navigationCrowd.removeAgent(navigationComponent.agentIndex);
    }

    if (navigationComponent.agentTransformNode) {
        navigationComponent.agentTransformNode.dispose();
        navigationComponent.agentTransformNode = null;
    }

    navigationComponent.agentIndex = -1;
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

    const actorState = getActorStateComponentArray()[entityId];
    if (actorState && actorState.isCastingAction) {
        return;
    }

    navigationComponent.onDestinationReachedEvent =
        onDestinationReached ?? null;

    if (
        navigationComponent.isNavigating &&
        navigationComponent.destination &&
        Vector3.Distance(navigationComponent.destination, destination) <=
            NAV_DESTINATION_UPDATE_EPSILON
    ) {
        return;
    }

    navigationComponent.destination = destination.clone();
    navigationComponent.isNavigating = true;

    const navigationCrowd = getNavigationCrowd();
    if (!navigationCrowd) {
        return;
    }

    addNavigationAgent(navigationComponent);
    if (navigationComponent.agentIndex < 0) {
        return;
    }

    navigationCrowd.agentGoto(navigationComponent.agentIndex, destination);
}

export function stopNavigation(entityId: EntityId): void {
    const navigationComponent = getActorNavigation(entityId);
    if (!navigationComponent) {
        return;
    }

    if (!navigationComponent.isNavigating && !navigationComponent.destination) {
        return;
    }

    navigationComponent.destination = null;
    navigationComponent.isNavigating = false;
    navigationComponent.onDestinationReachedEvent = null;

    const navigationCrowd = getNavigationCrowd();
    if (!navigationCrowd || navigationComponent.agentIndex < 0) {
        return;
    }

    if (navigationComponent.isCollisionBlocked) {
        navigationComponent.isCollisionBlocked = false;
        navigationCrowd.updateAgentParameters(
            navigationComponent.agentIndex,
            getDefaultNavigationAgentParams(navigationComponent.speed),
        );
        return;
    }

    navigationCrowd.agentGoto(
        navigationComponent.agentIndex,
        navigationComponent.position,
    );
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

    let navigationCrowd = getNavigationCrowd();
    if (navigationComponent.agentIndex >= 0 && navigationCrowd) {
        navigationCrowd.agentTeleport(navigationComponent.agentIndex, position);
    }
}
