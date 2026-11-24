import { AbstractMesh, Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import {
    AbilityData,
    AbilityTarget,
    LoadoutSlotKey,
} from "src/types/AbilityTypes";
import { TargetingInputType } from "src/types/CollisionTypes";
import { getActorStateComponentArray } from "./ComponentModule";
import {
    getActorPosition,
    hasLineOfSightToPosition,
} from "./Collision3DModule";
import {
    getValidatedPlayerAction,
    queuePlayerAction,
    setTacticalPause,
} from "./CombatModule";
import {
    getAimDirectionFromPointer,
    getTargetableActors,
} from "./ControlModule";
import {
    getControlState,
    getGameScene,
    getGameplayState,
} from "./GameStateModule";
import { getTargetingInputProcessor } from "./ProcessorModule";
import { clearManualMovementDestination } from "./ActorNavigationModule";
import { TargetingInputFunctionProps } from "src/processors/TargetingInputProcessor";
import ControlState from "src/states/ControlState";
import { LOS_RAY_HEIGHT } from "src/constants/BehaviorConstants";
import { VISIBILITY_OBSTACLE_METADATA_KEY } from "src/constants/RenderConstants";

export function getTargetingInputType(
    actionData: AbilityData,
): TargetingInputType {
    if (actionData.target === AbilityTarget.self) {
        return "confirm";
    }

    const shapeType = actionData.targetingShape?.type;
    if (shapeType === "cone") {
        return "direction";
    }
    if (shapeType === "sphere") {
        return "confirm";
    }

    return "unit";
}

export function beginActionTargeting(
    eid: EntityId,
    loadoutSlotKey: LoadoutSlotKey,
): void {
    const controlState = getControlState();
    if (controlState.controlPauseSet.size > 0) {
        return;
    }

    for (const pauseId of controlState.actionPauseSet) {
        if (pauseId !== PAUSE_TACTICALPAUSE) {
            return;
        }
    }

    const actionData = getValidatedPlayerAction(eid, loadoutSlotKey);
    if (!actionData) {
        return;
    }

    setTargetingInControlState({
        controlState,
        actionData,
        eid,
        actionSlotKey: loadoutSlotKey,
    });
    setTacticalPause(true);
}

interface TargetingControlStateProps {
    controlState: ControlState;
    actionData: AbilityData;
    eid: number;
    actionSlotKey: LoadoutSlotKey;
}

function setTargetingInControlState({
    controlState,
    actionData,
    eid,
    actionSlotKey,
}: TargetingControlStateProps) {
    if (!controlState.isTargetingAction) {
        controlState.wasTacticalPauseActive =
            controlState.actionPauseSet.has(PAUSE_TACTICALPAUSE);
    }
    controlState.isTargetingAction = true;
    controlState.targetingAction = actionData;
    controlState.targetingSourceEid = eid;
    controlState.targetingActionSlotKey = actionSlotKey;
}

export function cancelActionTargeting(): void {
    const controlState = getControlState();
    if (!controlState.isTargetingAction) {
        return;
    }

    const restoreTacticalPause = controlState.wasTacticalPauseActive;
    resetTargetingInControlState();
    setTacticalPause(restoreTacticalPause);
}

export function resetTargetingInControlState(): void {
    const controlState = getControlState();
    controlState.isTargetingAction = false;
    controlState.targetingAction = null;
    controlState.targetingSourceEid = -1;
    controlState.targetingActionSlotKey = null;
    controlState.wasTacticalPauseActive = false;
}

export function handleTargetingPointerDown(pointerButton: number): void {
    const controlState = getControlState();
    if (!controlState.isTargetingAction) {
        return;
    }

    if (pointerButton === controlState.controlSettings.moveMouseButton) {
        cancelActionTargeting();
        return;
    }

    if (pointerButton !== controlState.controlSettings.targetMouseButton) {
        return;
    }

    const actionData = controlState.targetingAction;
    if (!actionData) {
        return;
    }

    const targetingInputProcessor = getTargetingInputProcessor();
    const targetingInputFunction = targetingInputProcessor.getProcessorFunction(
        getTargetingInputType(actionData),
    );
    targetingInputFunction({
        sourceEntityId: controlState.targetingSourceEid,
        actionData,
        shape: actionData.targetingShape,
        pickedEntityId: getPickedActorEntityId(),
        pickedGroundPosition: getPickedGroundPosition(),
    });
}

export function confirmUnitTargeting(props: TargetingInputFunctionProps): void {
    const targetEntityId = props.pickedEntityId;
    if (targetEntityId < 0) {
        return;
    }
    if (
        !getValidTargetEntityIds(
            props.sourceEntityId,
            props.actionData,
        ).includes(targetEntityId)
    ) {
        return;
    }

    const actorState = getActorStateComponentArray()[props.sourceEntityId];
    const targetPosition = getActorPosition(targetEntityId);
    if (!actorState || !targetPosition) {
        return;
    }

    actorState.currentTargetEntityId = targetEntityId;
    actorState.currentTargetPosition = targetPosition.clone();
    actorState.currentAimDirection = null;
    finalizeActionTargeting(props.sourceEntityId);
}

export function confirmSelfTargeting(props: TargetingInputFunctionProps): void {
    const actorState = getActorStateComponentArray()[props.sourceEntityId];
    const sourcePosition = getActorPosition(props.sourceEntityId);
    if (!actorState || !sourcePosition) {
        return;
    }

    actorState.currentTargetPosition = sourcePosition.clone();
    actorState.currentAimDirection = null;
    finalizeActionTargeting(props.sourceEntityId);
}

export function confirmDirectionTargeting(
    props: TargetingInputFunctionProps,
): void {
    const actorState = getActorStateComponentArray()[props.sourceEntityId];
    const sourcePosition = getActorPosition(props.sourceEntityId);
    if (!actorState || !sourcePosition) {
        return;
    }

    actorState.currentAimDirection = getAimDirectionFromPickedPosition(
        sourcePosition,
        props.pickedGroundPosition,
    );
    actorState.currentTargetPosition = sourcePosition.clone();
    finalizeActionTargeting(props.sourceEntityId);
}

export function getValidTargetEntityIds(
    sourceEntityId: EntityId,
    actionData: AbilityData,
): EntityId[] {
    const candidates = getTargetableActors(sourceEntityId, actionData);
    const validEntityIds: EntityId[] = [];
    for (const entityId of candidates) {
        const targetPosition = getActorPosition(entityId);
        if (!targetPosition) {
            continue;
        }
        if (!hasLineOfSightToPosition(sourceEntityId, targetPosition)) {
            continue;
        }
        validEntityIds.push(entityId);
    }

    return validEntityIds;
}

function finalizeActionTargeting(sourceEntityId: EntityId): void {
    const controlState = getControlState();
    const actionSlotKey = controlState.targetingActionSlotKey;
    if (!actionSlotKey) {
        return;
    }

    const restoreTacticalPause = controlState.wasTacticalPauseActive;
    clearManualMovementDestination(sourceEntityId);
    resetTargetingInControlState();
    queuePlayerAction(sourceEntityId, actionSlotKey);
    setTacticalPause(restoreTacticalPause);
}

function getAimDirectionFromPickedPosition(
    sourcePosition: Vector3,
    pickedPosition: Nullable<Vector3>,
): Vector3 {
    if (pickedPosition) {
        const aimDirection = pickedPosition.subtract(sourcePosition);
        aimDirection.y = 0;
        if (aimDirection.lengthSquared() > 0.0001) {
            return aimDirection.normalize();
        }
    }

    return getAimDirectionFromPointer(sourcePosition);
}

function getPickedActorEntityId(): EntityId {
    const gameScene = getGameScene();
    const actorPick = gameScene.pick(
        gameScene.pointerX,
        gameScene.pointerY,
        (mesh) =>
            mesh.isPickable &&
            mesh.isVisible &&
            (mesh.name.startsWith("enBattlerSprite_") ||
                mesh.name.startsWith("pcSprite_")),
    );
    if (actorPick?.hit && actorPick.pickedMesh) {
        const pickedEntityId = (
            actorPick.pickedMesh.metadata as Record<string, number> | undefined
        )?.entityId;
        if (pickedEntityId !== undefined && pickedEntityId >= 0) {
            return pickedEntityId;
        }
    }

    return -1;
}

function getPickedGroundPosition(): Nullable<Vector3> {
    const gameScene = getGameScene();
    const groundPick = gameScene.pick(
        gameScene.pointerX,
        gameScene.pointerY,
        (mesh) => mesh.name === "env_floor",
    );
    if (groundPick?.hit && groundPick.pickedPoint) {
        return groundPick.pickedPoint.clone();
    }

    return null;
}

export function getLivingPartyEntityIds(): EntityId[] {
    const livingPartyEntityIds = getGameplayState().playerEntityIds.filter(
        (entityId) => {
            const actorState = getActorStateComponentArray()[entityId];
            const actorPosition = getActorPosition(entityId);
            return !actorState.isDefeated && actorPosition;
        },
    );

    return livingPartyEntityIds;
}

export function hasPartyLineOfSightToPosition(
    targetPosition: Vector3,
    ignoredMesh?: AbstractMesh,
): boolean {
    for (let entityId of getLivingPartyEntityIds()) {
        const hasLOS = ignoredMesh
            ? hasLineOfSightToPosition(entityId, targetPosition, ignoredMesh)
            : hasLineOfSightToPosition(entityId, targetPosition);
        if (hasLOS) {
            return true;
        }
    }

    return false;
}

export function isActorVisibleToParty(entityId: EntityId): boolean {
    const actorPosition = getActorPosition(entityId);
    if (!actorPosition) {
        return false;
    }

    return hasPartyLineOfSightToPosition(actorPosition);
}

export function isObstacleVisibleToParty(mesh: AbstractMesh): boolean {
    const meshBoundingBox = mesh.getBoundingInfo().boundingBox;
    const minimumWorld = meshBoundingBox.minimumWorld;
    const maximumWorld = meshBoundingBox.maximumWorld;

    const centerX = (minimumWorld.x + maximumWorld.x) / 2;
    const centerZ = (minimumWorld.z + maximumWorld.z) / 2;
    const sampleY = maximumWorld.y - LOS_RAY_HEIGHT;
    const cornersToCheck = [
        new Vector3(centerX, sampleY, centerZ),
        new Vector3(minimumWorld.x, sampleY, minimumWorld.z),
        new Vector3(maximumWorld.x, sampleY, maximumWorld.z),
        new Vector3(minimumWorld.x, sampleY, maximumWorld.z),
        new Vector3(maximumWorld.x, sampleY, minimumWorld.z),
    ];

    for (let cornerPosition of cornersToCheck) {
        const hasLOS = hasPartyLineOfSightToPosition(
            cornerPosition,
            mesh,
        );
        if (hasLOS) {
            return true;
        }
    }

    return false;
}

export function isObstacleMesh(mesh: AbstractMesh): boolean {
    const metadata = mesh.metadata;
    if (metadata) {
        return metadata[VISIBILITY_OBSTACLE_METADATA_KEY];
    } else {
        return false;
    }
}
