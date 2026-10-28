import {
	AbstractMesh,
	ActionEvent,
	ActionManager,
	ExecuteCodeAction,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { PAUSE_TACTICALPAUSE } from "src/constants/GeneralConstants";
import { getGameCanvas } from "./SceneModule";
import { setTacticalPause, startQueueActionPlayer } from "./CombatModule";
import {
	getControlState,
	getGameScene,
	getGameplayState,
	getUserInterfaceState,
} from "./GameStateModule";
import { setSelectedCharacter } from "./CharacterModule";
import { getActorStateComponentArray } from "./ComponentModule";
import { startCombat } from "./CombatModule";
import ControlState from "src/states/ControlState";
import {
	AbilityData,
	AbilityTarget,
	ActionSlotKey,
} from "src/types/AbilityTypes";
import { clamp } from "./Utils";
import { getActorPosition } from "./Collision3DModule";
import { EntityId } from "bitecs";

export function clearActionPause() {
	const controlState = getControlState();
	if (controlState.actionPauseSet.size > 0) {
		controlState.actionPauseSet.clear();
	}
}

export function clearControlPause() {
	const controlState = getControlState();
	if (controlState.controlPauseSet.size > 0) {
		controlState.controlPauseSet.clear();
	}
}

export function attachCameraControl(): boolean {
	const gameCanvas = getGameCanvas();
	const gameScene = getGameScene();
	const camera = gameScene.activeCamera as UniversalCamera;
	if (camera && gameCanvas) {
		camera.attachControl(gameCanvas);
		return true;
	} else {
		return false;
	}
}

export function detachCameraControl(): boolean {
	const gameScene = getGameScene();
	const camera = gameScene.activeCamera as UniversalCamera;
	if (camera) {
		camera.detachControl();
		return true;
	} else {
		return false;
	}
}

function startPlayerAction(actionSlotKey: ActionSlotKey, actionIndex: number) {
	const controlState = getControlState();
	const gameplayState = getGameplayState();
	if (controlState.controlPauseSet.size > 0) {
		return;
	}
	startQueueActionPlayer(
		gameplayState.selectedPlayerEID,
		actionSlotKey,
		actionIndex,
	);
}

function registerPowerKeyBindings(
	actionManager: ActionManager,
	controlState: ControlState,
) {
	controlState.controlSettings.powerKeys.forEach((powerKey, powerIndex) => {
		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: powerKey,
				},
				() => {
					startPlayerAction(ActionSlotKey.power, powerIndex);
				},
			),
		);
	});
}

function getSwitchPlayerFunction(
	selectionDirection: number,
	isCombatMode?: boolean,
): (evt: ActionEvent) => void {
	return () => {
		const gameplayState = getGameplayState();
		const controlState = getControlState();
		if (controlState.controlPauseSet.size > 0) {
			return;
		}
		const currentSelectedPlayerEntityIdIndex =
			gameplayState.playerEntityIds.findIndex(
				(x) => x === gameplayState.selectedPlayerEID,
			);
		const newSelectedPlayerEntityIdIndex =
			(currentSelectedPlayerEntityIdIndex +
				selectionDirection +
				gameplayState.playerEntityIds.length) %
			gameplayState.playerEntityIds.length;
		setSelectedCharacter(
			gameplayState.playerEntityIds[newSelectedPlayerEntityIdIndex],
			isCombatMode,
		);
	};
}

function registerSwitchPlayerBindings(
	actionManager: ActionManager,
	controlState: ControlState,
	isCombatMode?: boolean,
) {
	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerLeft,
			},
			getSwitchPlayerFunction(-1, isCombatMode),
		),
	);
	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.switchPlayerRight,
			},
			getSwitchPlayerFunction(1, isCombatMode),
		),
	);
}

export function resetExploreModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	if (attachCameraControl()) {
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = true;
		});
	}
}

export function resetExploreModeActionManager() {
	const gameScene = getGameScene();
	const controlState = getControlState();

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(gameScene);

	registerPowerKeyBindings(actionManager, controlState);
	registerSwitchPlayerBindings(actionManager, controlState, false);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.debugStartCombat,
			},
			() => {
				if (
					controlState.controlPauseSet.size > 0 ||
					controlState.actionPauseSet.size > 0
				) {
					return;
				}
				const gameScene = getGameScene();
				const firstEncounterId = Object.keys(gameScene.encounters)[0];
				if (firstEncounterId) {
					startCombat(firstEncounterId);
				}
			},
		),
	);

	controlState.actionManager = actionManager;
	gameScene.actionManager = actionManager;
}

export function resetCombatModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	if (detachCameraControl()) {
		userInterfaceState.sceneGUI.rootContainer.isVisible = true;

		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = true;
		});
	}
}

export function resetCombatModeActionManager() {
	const gameScene = getGameScene();
	const controlState = getControlState();
	const userInterfaceState = getUserInterfaceState();
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	const actorState =
		actorStateComponentArray[gameplayState.selectedPlayerEID];
	if (actorState) {
		userInterfaceState.combatHud.setActionBar(actorState);
	}

	if (controlState.actionManager) {
		controlState.actionManager.dispose();
		controlState.actionManager = null;
	}

	const actionManager = new ActionManager(gameScene);

	registerPowerKeyBindings(actionManager, controlState);
	registerSwitchPlayerBindings(actionManager, controlState, true);

	actionManager.registerAction(
		new ExecuteCodeAction(
			{
				trigger: ActionManager.OnKeyDownTrigger,
				parameter: controlState.controlSettings.tacticalPause,
			},
			() => {
				if (controlState.controlPauseSet.size > 0) {
					return;
				}
				setTacticalPause(
					!controlState.actionPauseSet.has(PAUSE_TACTICALPAUSE),
				);
			},
		),
	);

	controlState.actionManager = actionManager;
	gameScene.actionManager = actionManager;
}

export function resetDialogueModeControls() {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();
	const camera = getGameScene().activeCamera as UniversalCamera;

	if (camera) {
		camera.detachControl();
		userInterfaceState.sceneGUI.rootContainer.isVisible = false;
		controlState.exploreGUIControls.forEach((child) => {
			child.isVisible = false;
		});
	}
}

export function getAimDirectionFromPointer(sourcePosition: Vector3): Vector3 {
	const gameScene = getGameScene();
	const aimDirection = new Vector3(0, 0, -1);

	if (gameScene.activeCamera) {
		const pickResult = gameScene.pick(
			gameScene.pointerX,
			gameScene.pointerY,
			(mesh) => !isExcludedFromAimPicking(mesh),
		);
		if (pickResult?.hit && pickResult.pickedPoint) {
			const pointerDirection =
				pickResult.pickedPoint.subtract(sourcePosition);
			pointerDirection.y = 0;
			if (pointerDirection.lengthSquared() > 0.0001) {
				return pointerDirection.normalize();
			}
		}

		const cameraForward = gameScene.activeCamera.getForwardRay().direction;
		cameraForward.y = 0;
		if (cameraForward.lengthSquared() > 0.0001) {
			return cameraForward.normalize();
		}
	}

	return aimDirection;
}

function isExcludedFromAimPicking(mesh: AbstractMesh): boolean {
	return (
		mesh.name === "skybox" ||
		mesh.name === "targetHighlight" ||
		mesh.name.startsWith("pcSprite_") ||
		mesh.name.startsWith("enBattlerSprite_") ||
		mesh.name.startsWith("abilityProjectile_")
	);
}

export function getTargetableActors(
	sourceEid: EntityId,
	actionData: AbilityData,
): EntityId[] {
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	const isSourcePlayer = gameplayState.playerEntityIds.includes(sourceEid);

	const wantsEnemies =
		actionData.target === AbilityTarget.singleEnemy ||
		actionData.target === AbilityTarget.groupEnemy;
	const wantsAllies =
		actionData.target === AbilityTarget.singleAlly ||
		actionData.target === AbilityTarget.groupAlly;

	let candidateEids: EntityId[] = [];
	if (wantsEnemies) {
		candidateEids = isSourcePlayer
			? gameplayState.enemyEntityIds
			: gameplayState.playerEntityIds;
	} else if (wantsAllies) {
		candidateEids = isSourcePlayer
			? gameplayState.playerEntityIds
			: gameplayState.enemyEntityIds;
	}

	return candidateEids.filter((eid) => {
		if (eid === sourceEid || !getActorPosition(eid)) {
			return false;
		}
		const actorState = actorStateComponentArray[eid];
		return actorState && !actorState.isDefeated;
	});
}

function distanceToSegment(
	point: Vector3,
	segmentStart: Vector3,
	segmentEnd: Vector3,
): number {
	const segment = segmentEnd.subtract(segmentStart);
	const segmentLengthSquared = segment.lengthSquared();
	if (segmentLengthSquared === 0) {
		return Vector3.Distance(point, segmentStart);
	}
	const projection = clamp(
		Vector3.Dot(point.subtract(segmentStart), segment) /
			segmentLengthSquared,
		0,
		1,
	);
	const closestPoint = segmentStart.add(segment.scale(projection));
	return Vector3.Distance(point, closestPoint);
}
