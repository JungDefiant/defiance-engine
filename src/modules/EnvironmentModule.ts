import {
    Color3,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import { GameScene } from "src/scenes/GameScene";
import { Themes } from "src/gui/Themes";
import { ACTOR_GROUND_Y } from "src/constants/GeneralConstants";
import { registerNavigationObstacle } from "./ActorNavigationModule";
import { VISIBILITY_OBSTACLE_METADATA_KEY } from "src/constants/RenderConstants";

const ENV_SIZE = 88;
const WALL_HEIGHT = 6;
const WALL_THICKNESS = 2;
const PILLAR_DIAMETER = 2;
const CRATE_SIZE = 2.4;

export function createEnvironment(gameScene: GameScene): void {
    createFloor(gameScene);
    createWalls(gameScene);
    createPillars(gameScene);
    createCrates(gameScene);
    createCoverWalls(gameScene);
}

function createFloor(gameScene: GameScene): void {
    const floor = MeshBuilder.CreateBox(
        "env_floor",
        {
            width: ENV_SIZE,
            height: 0.5,
            depth: ENV_SIZE,
        },
        gameScene,
    );
    floor.position.y = ACTOR_GROUND_Y - 0.25;
    floor.material = createEnvironmentMaterial(
        gameScene,
        "mat_env_floor",
        new Color3(0.22, 0.22, 0.22),
    );
}

function createWalls(gameScene: GameScene): void {
    const wallMaterial = createEnvironmentMaterial(
        gameScene,
        "mat_env_wall",
        Color3.FromHexString(Themes.primary1),
    );
    const halfSize = ENV_SIZE / 2;
    const wallY = ACTOR_GROUND_Y + WALL_HEIGHT / 2;

    const wallSpecs = [
        {
            name: "env_wall_north",
            position: new Vector3(0, wallY, -halfSize),
            width: ENV_SIZE,
            depth: WALL_THICKNESS,
        },
        {
            name: "env_wall_south",
            position: new Vector3(0, wallY, halfSize),
            width: ENV_SIZE,
            depth: WALL_THICKNESS,
        },
        {
            name: "env_wall_west",
            position: new Vector3(-halfSize, wallY, 0),
            width: WALL_THICKNESS,
            depth: ENV_SIZE,
        },
        {
            name: "env_wall_east",
            position: new Vector3(halfSize, wallY, 0),
            width: WALL_THICKNESS,
            depth: ENV_SIZE,
        },
    ];

    for (const wallSpec of wallSpecs) {
        const wall = MeshBuilder.CreateBox(
            wallSpec.name,
            {
                width: wallSpec.width,
                height: WALL_HEIGHT,
                depth: wallSpec.depth,
            },
            gameScene,
        );
        wall.position.copyFrom(wallSpec.position);
        wall.material = wallMaterial;
        registerSolidObstacle(
            wall,
            new Vector3(
                wallSpec.width / 2,
                WALL_HEIGHT / 2,
                wallSpec.depth / 2,
            ),
        );
    }
}

function createPillars(gameScene: GameScene): void {
    const pillarMaterial = createEnvironmentMaterial(
        gameScene,
        "mat_env_pillar",
        Color3.FromHexString(Themes.primary2),
    );
    const pillarY = ACTOR_GROUND_Y + WALL_HEIGHT / 2;

    const pillarPositions = [
        new Vector3(-12, pillarY, -12),
        new Vector3(12, pillarY, -12),
        new Vector3(-12, pillarY, 12),
        new Vector3(12, pillarY, 12),
    ];

    for (const pillarPosition of pillarPositions) {
        const pillar = MeshBuilder.CreateCylinder(
            "env_pillar",
            {
                diameter: PILLAR_DIAMETER,
                height: WALL_HEIGHT,
                tessellation: 12,
            },
            gameScene,
        );
        pillar.position.copyFrom(pillarPosition);
        pillar.material = pillarMaterial;
        registerSolidObstacle(
            pillar,
            new Vector3(
                PILLAR_DIAMETER / 2,
                WALL_HEIGHT / 2,
                PILLAR_DIAMETER / 2,
            ),
        );
    }
}

function createCrates(gameScene: GameScene): void {
    const crateMaterial = createEnvironmentMaterial(
        gameScene,
        "mat_env_crate",
        Color3.FromHexString(Themes.secondary2),
    );
    const crateY = ACTOR_GROUND_Y + CRATE_SIZE / 2;

    const cratePositions = [
        new Vector3(6, crateY, 4),
        new Vector3(-6, crateY, -4),
        new Vector3(4, crateY, -8),
        new Vector3(-8, crateY, 6),
    ];

    for (const cratePosition of cratePositions) {
        const crate = MeshBuilder.CreateBox(
            "env_crate",
            {
                width: CRATE_SIZE,
                height: CRATE_SIZE,
                depth: CRATE_SIZE,
            },
            gameScene,
        );
        crate.position.copyFrom(cratePosition);
        crate.material = crateMaterial;
        registerSolidObstacle(
            crate,
            new Vector3(CRATE_SIZE / 2, CRATE_SIZE / 2, CRATE_SIZE / 2),
        );
    }
}

function createCoverWalls(gameScene: GameScene): void {
    const coverMaterial = createEnvironmentMaterial(
        gameScene,
        "mat_env_cover",
        Color3.FromHexString(Themes.neutral1),
    );
    const coverY = ACTOR_GROUND_Y + 1;

    const coverSpecs = [
        {
            name: "env_cover_west",
            position: new Vector3(-16, coverY, -2),
        },
        {
            name: "env_cover_east",
            position: new Vector3(16, coverY, 2),
        },
    ];

    for (const coverSpec of coverSpecs) {
        const coverWall = MeshBuilder.CreateBox(
            coverSpec.name,
            {
                width: 8,
                height: 2,
                depth: 1,
            },
            gameScene,
        );
        coverWall.position.copyFrom(coverSpec.position);
        coverWall.rotation.y = Math.PI / 4;
        coverWall.material = coverMaterial;
        registerSolidObstacle(coverWall, new Vector3(4, 1, 0.5), Math.PI / 4);
    }
}

function createEnvironmentMaterial(
    gameScene: GameScene,
    name: string,
    color: Color3,
): StandardMaterial {
    const material = new StandardMaterial(name, gameScene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    return material;
}

function registerSolidObstacle(
    mesh: Mesh,
    halfExtents: Vector3,
    yaw: number = 0,
): void {
    mesh.checkCollisions = true;
    mesh.metadata = {
        ...(mesh.metadata ?? {}),
        [VISIBILITY_OBSTACLE_METADATA_KEY]: true,
    };
    registerNavigationObstacle({
        center: mesh.position.clone(),
        halfExtents,
        yaw,
    });
}
