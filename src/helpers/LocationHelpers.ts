import SceneManagerSystem, {
	NewLocationSceneParams,
} from "src/systems/SceneManagerSystem";
import { clearSceneGUI } from "./UserInterfaceHelpers";
import {
	DoorData,
	Interactable as Interactable,
	Location,
} from "src/types/GameTypes";
import {
	EventState,
	Nullable,
	TransformNode,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { Button, Control, Vector2WithInfo } from "@babylonjs/gui";
import { getPublicRoot } from "./Utils";
import { container } from "tsyringe";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import EventHandlerSystem from "src/systems/EventHandlerSystem";
import { BASE_MOVEMENT_SPEED } from "src/constants/GeneralConstants";
import { addComponent, set } from "bitecs";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import UserInterfaceState from "src/states/UserInterfaceState";
import SceneState from "src/states/SceneState";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { getViewPositionNode } from "./SceneHelpers";

export async function loadLocation(
	locationId: string,
	newLocationSceneParams: NewLocationSceneParams,
): Promise<Nullable<Location>> {
	await clearSceneGUI();
	newLocationSceneParams.exploreGUIControls.length = 0;

	const locationData = newLocationSceneParams.sceneState.locations.find(
		(loc) => loc.id === locationId,
	);

	if (!locationData) {
		return null;
	}

	locationData.interactables.forEach(async (itr) => {
		await createLocationInteractable(itr, newLocationSceneParams);
	});

	locationData.doors.forEach(async (door) => {
		await loadLocationDoor(door, newLocationSceneParams);
	});

	filterLocationEvents(locationData);

	return locationData;
}

export async function createLocationInteractable(
	interactable: Interactable,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const interactableNode = newLocationSceneParams.sceneState.sceneNodes.find(
		(x) => x.id == interactable.interactableNodeId,
	);

	if (!interactableNode) {
		return;
	}

	const button = Button.CreateImageOnlyButton(
		interactable.id,
		`${getPublicRoot()}/sprites/gui/icons/icon_interact.png`,
	);
	button.width = 0.075;
	button.height = 0.1125;
	button.thickness = 0;
	button.onPointerEnterObservable.add(
		enableHighlightInfoUIFunction(interactable),
	);
	button.onPointerOutObservable.add(disableHighlightInfoUIFunction());
	button.onPointerClickObservable.add(
		startDialogueFromInteractableFunction(interactable, interactableNode),
	);
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(interactableNode);
}

function startDialogueFromInteractableFunction(
	interactable: Interactable,
	interactableNode: TransformNode,
): (eventData: Vector2WithInfo, eventState: EventState) => void {
	return () => {
		setLastExploreViewTarget();
		const viewPositionNode = getViewPositionNode(
			interactable.viewPositionNodeId,
		);

		if (viewPositionNode) {
			const systemRegistry = container.resolve(SystemRegistry);
			const dialogueManagerSystem =
				systemRegistry.getGameSystemBySystemId<DialogueManagerSystem>(
					DialogueManagerSystem.toString(),
				);
			dialogueManagerSystem.startDialogue(interactable.dialogueNodeId, {
				interactablePositionNode: interactableNode,
				viewPositionNode: viewPositionNode,
			});
		}
	};
}

function setLastExploreViewTarget() {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const sceneState = gameStateRegistry.getGameStateByStateId<SceneState>(
		SceneState.toString(),
	);
	const currCamera = sceneState.currentScene.activeCamera as UniversalCamera;
	if (currCamera) {
		sceneState.lastExploreViewTarget = currCamera.getTarget();
	}
}

function enableHighlightInfoUIFunction(
	interactable: Interactable,
): (eventData: Control, eventState: EventState) => void {
	return () => {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		userInterfaceState.exploreHud.updateHighlightInfoUI(
			interactable.name,
			interactable.description,
		);
	};
}

function disableHighlightInfoUIFunction(): (
	eventData: Control,
	eventState: EventState,
) => void {
	return () => {
		const gameStateRegistry = container.resolve(GameStateRegistry);
		const userInterfaceState =
			gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		userInterfaceState.exploreHud.hideHighlightInfoUI();
	};
}

export async function filterLocationEvents(locationData: Location) {
	const uniqueEvents = new Set<string>();
	const eventIndsToRemove = new Array<number>();
	locationData.events.forEach((evt, index) => {
		const eventKey = `${evt.trigger}_${evt.type}_${evt.condition}`;
		if (uniqueEvents.has(eventKey)) {
			eventIndsToRemove.push(index);
		} else {
			uniqueEvents.add(eventKey);
		}
	});

	eventIndsToRemove.forEach((index) => {
		locationData.events.splice(index);
	});
}

export async function finishTransitionToNewLocation() {
	const smSystem = container.resolve(SceneManagerSystem);
	const ehSystem = container.resolve(EventHandlerSystem);
	const gameState = container.resolve(GameState);

	smSystem.resetViewPosition(gameState);
	gameState.exploreHud.hideHighlightInfoUI();
	ehSystem.checkEventByTrigger("OnLocationEnter");
	console.log("CURR LOC", gameState.currentLocation);
	const sceneGUIChildren = gameState.sceneGUI.getChildren();
	for (let i = 0; i < sceneGUIChildren.length; i++) {
		const sceneGUIObject = sceneGUIChildren[i];
		sceneGUIObject.isVisible = true;
	}
}
export async function transitionToNewLocation(
	currentLocationViewNode: TransformNode,
	destinationId: string,
) {
	const gameState = container.resolve(GameState);
	const smSystem = container.resolve(SceneManagerSystem);
	const newLocationSceneParams = {
		scene: gameState.scene,
		sceneData: gameState.sceneData,
		sceneNodes: gameState.sceneNodes,
		sceneGUI: gameState.sceneGUI,
		exploreGUIControls: gameState.exploreGUIControls,
	} as NewLocationSceneParams;
	const newLoc = await loadLocation(destinationId, newLocationSceneParams);

	if (!newLoc) {
		return;
	}

	const currCamera = gameState.scene.activeCamera as UniversalCamera;
	if (currCamera) {
		gameState.lastExploreViewTarget =
			currentLocationViewNode.absolutePosition;
	}

	gameState.currentLocation = newLoc;

	let cameraTransformNode = currCamera.parent;
	if (!cameraTransformNode) {
		const newTransformNode = new TransformNode("activeCamNode");
		newTransformNode.setAbsolutePosition(currCamera.position);
		currCamera.parent = newTransformNode;
		currCamera.position = Vector3.Zero();
		cameraTransformNode = newTransformNode;
	}

	const sceneGUIChildren = gameState.sceneGUI.getChildren();
	for (let i = 0; i < sceneGUIChildren.length; i++) {
		const sceneGUIObject = sceneGUIChildren[i];
		sceneGUIObject.isVisible = false;
	}

	const viewNode = gameState.sceneNodes.find(
		(x) => x.id === newLoc.exploreViewNodeId,
	) as TransformNode;
	const entityMovement = new EntityMovementComponent(
		cameraTransformNode as TransformNode,
		viewNode.position,
		BASE_MOVEMENT_SPEED,
		async () => {
			finishTransitionToNewLocation();
		},
	);
	addComponent(
		gameState.world,
		gameState.cameraEID,
		set(gameState.EntityMovement, entityMovement),
	);
}
export async function loadLocationDoor(
	doorData: DoorData,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const sceneNode = newLocationSceneParams.sceneNodes.find(
		(x) => x.id == doorData.id,
	);

	if (!sceneNode) {
		return;
	}

	const button = Button.CreateImageOnlyButton(
		doorData.id,
		`${getPublicRoot()}/sprites/gui/icons/icon_door.png`,
	);
	button.width = 0.1;
	button.height = 0.1;
	button.thickness = 0;
	button.onPointerEnterObservable.add(() => {
		const gameState = container.resolve(GameState);
		gameState.exploreHud.updateHighlightInfoUI(
			`Head To ${doorData.destination}`,
			doorData.destination,
		);
	});
	button.onPointerOutObservable.add(() => {
		const gameState = container.resolve(GameState);
		gameState.exploreHud.hideHighlightInfoUI();
	});
	button.onPointerClickObservable.add(async () => {
		transitionToNewLocation(sceneNode, doorData.destination);
	});
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(sceneNode);
}
