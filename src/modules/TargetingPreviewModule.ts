import {
    Color3,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    VertexData,
    Vector3,
} from "@babylonjs/core";
import { EntityId } from "bitecs";
import { Themes } from "src/gui/Themes";
import {
    DEFAULT_CONE_ANGLE,
    DEFAULT_CONE_RANGE,
    DEFAULT_SPHERE_RADIUS,
    PREVIEW_ALPHA,
    PREVIEW_GROUND_OFFSET,
    PREVIEW_RING_THICKNESS,
    PREVIEW_TESSELLATION,
    TARGET_RING_DIAMETER,
    TARGET_RING_THICKNESS,
} from "src/constants/CombatConstants";
import { ACTOR_GROUND_Y } from "src/constants/GeneralConstants";
import { getGameScene, getTargetingPreviewState } from "./GameStateModule";
import { getActorPosition } from "./Collision3DModule";
import { getAimDirectionFromPointer } from "./ControlModule";
import { getValidTargetEntityIds } from "./ActionTargetingModule";
import { TargetingPreviewProps } from "src/processors/TargetingPreviewProcessor";
import { cmToMeters } from "./Utils";

export function updateUnitTargetingPreview(props: TargetingPreviewProps): void {
    const validEntityIds = getValidTargetEntityIds(
        props.sourceEntityId,
        props.actionData,
    );
    updateTargetRings(validEntityIds);

    if (props.actionData.targetingShape?.type === "sphereProjectile") {
        const hoveredEntityId = getHoveredValidEntityId(validEntityIds);
        updateSphereProjectilePreviewRing(hoveredEntityId, props.shape);
        return;
    }

    hideRadiusRing();
}

export function updateConfirmTargetingPreview(
    props: TargetingPreviewProps,
): void {
    clearTargetRings();
    hideSectorMesh();

    const sourcePosition = getActorPosition(props.sourceEntityId);
    if (!sourcePosition) {
        hideRadiusRing();
        return;
    }

    if (props.actionData.targetingShape?.type === "sphere") {
        const radius = cmToMeters(props.shape?.radius ?? DEFAULT_SPHERE_RADIUS);
        showRadiusRingAtPosition(sourcePosition, radius);
        return;
    }

    showRadiusRingAtPosition(sourcePosition, TARGET_RING_DIAMETER / 2);
}

export function updateDirectionTargetingPreview(
    props: TargetingPreviewProps,
): void {
    clearTargetRings();
    hideRadiusRing();

    const sourcePosition = getActorPosition(props.sourceEntityId);
    if (!sourcePosition) {
        hideSectorMesh();
        return;
    }

    const aimDirection = getAimDirectionFromPointer(sourcePosition);
    const range = cmToMeters(props.shape?.range ?? DEFAULT_CONE_RANGE);
    const angle = props.shape?.angle ?? DEFAULT_CONE_ANGLE;
    updateSectorMesh(sourcePosition, aimDirection, range, angle);
}

export function hideTargetingPreviews(): void {
    clearTargetRings();
    hideRadiusRing();
    hideSectorMesh();
}

function updateTargetRings(validEntityIds: EntityId[]): void {
    const targetingPreviewState = getTargetingPreviewState();
    const gameScene = getGameScene();
    const targetRings = targetingPreviewState.targetRings;

    for (const entityId of validEntityIds) {
        const targetPosition = getActorPosition(entityId);
        if (!targetPosition) {
            continue;
        }

        let targetRing = targetRings.get(entityId);
        if (!targetRing) {
            targetRing = MeshBuilder.CreateTorus(
                `targetingPreview_targetRing_${entityId}`,
                {
                    diameter: TARGET_RING_DIAMETER,
                    thickness: TARGET_RING_THICKNESS,
                    tessellation: PREVIEW_TESSELLATION,
                },
                gameScene,
            );
            targetRing.isPickable = false;
            targetRing.material = getTargetRingMaterial();
            targetRings.set(entityId, targetRing);
        }

        targetRing.position.copyFrom(targetPosition);
        targetRing.position.y = ACTOR_GROUND_Y + PREVIEW_GROUND_OFFSET;
    }

    for (const [entityId, targetRing] of targetRings) {
        if (!validEntityIds.includes(entityId)) {
            targetRing.dispose();
            targetRings.delete(entityId);
        }
    }
}

function clearTargetRings(): void {
    const targetingPreviewState = getTargetingPreviewState();
    for (const [, targetRing] of targetingPreviewState.targetRings) {
        targetRing.dispose();
    }
    targetingPreviewState.targetRings.clear();
}

function getHoveredValidEntityId(validEntityIds: EntityId[]): EntityId {
    const gameScene = getGameScene();
    const hoverPick = gameScene.pick(
        gameScene.pointerX,
        gameScene.pointerY,
        (mesh) =>
            mesh.name.startsWith("enBattlerSprite_") ||
            mesh.name.startsWith("pcSprite_"),
    );
    if (hoverPick?.hit && hoverPick.pickedMesh) {
        const hoveredEntityId = (
            hoverPick.pickedMesh.metadata as Record<string, number> | undefined
        )?.entityId;
        if (
            hoveredEntityId !== undefined &&
            validEntityIds.includes(hoveredEntityId)
        ) {
            return hoveredEntityId;
        }
    }

    return -1;
}

function updateSphereProjectilePreviewRing(
    hoveredEntityId: EntityId,
    shape: TargetingPreviewProps["shape"],
): void {
    if (hoveredEntityId < 0) {
        hideRadiusRing();
        return;
    }

    const hoveredPosition = getActorPosition(hoveredEntityId);
    if (!hoveredPosition) {
        hideRadiusRing();
        return;
    }

    const radius = cmToMeters(shape?.radius ?? DEFAULT_SPHERE_RADIUS);
    showRadiusRingAtPosition(hoveredPosition, radius);
}

function showRadiusRingAtPosition(position: Vector3, radius: number): void {
    const targetingPreviewState = getTargetingPreviewState();
    const gameScene = getGameScene();

    if (
        !targetingPreviewState.radiusRing ||
        targetingPreviewState.radiusRingRadius !== radius
    ) {
        if (targetingPreviewState.radiusRing) {
            targetingPreviewState.radiusRing.dispose();
        }

        const radiusRing = MeshBuilder.CreateTorus(
            "targetingPreview_radiusRing",
            {
                diameter: 2,
                thickness: PREVIEW_RING_THICKNESS,
                tessellation: PREVIEW_TESSELLATION,
            },
            gameScene,
        );
        radiusRing.isPickable = false;
        radiusRing.material = getRadiusRingMaterial();
        radiusRing.scaling.set(radius, 1, radius);
        targetingPreviewState.radiusRing = radiusRing;
        targetingPreviewState.radiusRingRadius = radius;
    }

    const radiusRing = targetingPreviewState.radiusRing;
    radiusRing.setEnabled(true);
    radiusRing.position.copyFrom(position);
    radiusRing.position.y = ACTOR_GROUND_Y + PREVIEW_GROUND_OFFSET;
}

function hideRadiusRing(): void {
    const targetingPreviewState = getTargetingPreviewState();
    if (targetingPreviewState.radiusRing) {
        targetingPreviewState.radiusRing.setEnabled(false);
    }
}

function updateSectorMesh(
    sourcePosition: Vector3,
    aimDirection: Vector3,
    range: number,
    angle: number,
): void {
    const targetingPreviewState = getTargetingPreviewState();

    if (
        !targetingPreviewState.sectorMesh ||
        targetingPreviewState.sectorAngle !== angle
    ) {
        if (targetingPreviewState.sectorMesh) {
            targetingPreviewState.sectorMesh.dispose();
        }
        targetingPreviewState.sectorMesh = createSectorMesh(angle);
        targetingPreviewState.sectorAngle = angle;
    }

    const sectorMesh = targetingPreviewState.sectorMesh;
    sectorMesh.setEnabled(true);
    sectorMesh.position.copyFrom(sourcePosition);
    sectorMesh.position.y = ACTOR_GROUND_Y + PREVIEW_GROUND_OFFSET;
    sectorMesh.rotation.y = Math.atan2(aimDirection.x, aimDirection.z);
    sectorMesh.scaling.setAll(range);
}

function hideSectorMesh(): void {
    const targetingPreviewState = getTargetingPreviewState();
    if (targetingPreviewState.sectorMesh) {
        targetingPreviewState.sectorMesh.setEnabled(false);
    }
}

function createSectorMesh(angleDegrees: number): Mesh {
    const gameScene = getGameScene();
    const halfAngle = (angleDegrees * (Math.PI / 180)) / 2;

    const positions: number[] = [0, 0, 0];
    const indices: number[] = [];
    for (let i = 0; i <= PREVIEW_TESSELLATION; i++) {
        const angle = -halfAngle + (i / PREVIEW_TESSELLATION) * (2 * halfAngle);
        positions.push(Math.sin(angle), 0, Math.cos(angle));
        if (i > 0) {
            indices.push(0, i, i + 1);
        }
    }

    const normals: number[] = [];
    const sectorMesh = new Mesh("targetingPreview_sector", gameScene);
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;
    vertexData.applyToMesh(sectorMesh);
    sectorMesh.isPickable = false;
    sectorMesh.material = getSectorMaterial();

    return sectorMesh;
}

function getTargetRingMaterial(): StandardMaterial {
    const targetingPreviewState = getTargetingPreviewState();
    if (!targetingPreviewState.targetRingMaterial) {
        targetingPreviewState.targetRingMaterial = createPreviewMaterial(
            "targetingPreview_targetRingMaterial",
            Themes.secondary3,
        );
    }
    return targetingPreviewState.targetRingMaterial;
}

function getRadiusRingMaterial(): StandardMaterial {
    const targetingPreviewState = getTargetingPreviewState();
    if (!targetingPreviewState.radiusRingMaterial) {
        targetingPreviewState.radiusRingMaterial = createPreviewMaterial(
            "targetingPreview_radiusRingMaterial",
            Themes.secondary2,
        );
    }
    return targetingPreviewState.radiusRingMaterial;
}

function getSectorMaterial(): StandardMaterial {
    const targetingPreviewState = getTargetingPreviewState();
    if (!targetingPreviewState.sectorMaterial) {
        targetingPreviewState.sectorMaterial = createPreviewMaterial(
            "targetingPreview_sectorMaterial",
            Themes.secondary2,
        );
        targetingPreviewState.sectorMaterial.backFaceCulling = false;
    }
    return targetingPreviewState.sectorMaterial;
}

function createPreviewMaterial(
    materialName: string,
    colorHex: string,
): StandardMaterial {
    const gameScene = getGameScene();
    const previewMaterial = new StandardMaterial(materialName, gameScene);
    previewMaterial.diffuseColor = Color3.FromHexString(colorHex);
    previewMaterial.emissiveColor = Color3.FromHexString(colorHex);
    previewMaterial.disableLighting = true;
    previewMaterial.alpha = PREVIEW_ALPHA;
    return previewMaterial;
}
