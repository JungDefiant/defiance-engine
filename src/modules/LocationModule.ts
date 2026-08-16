import { clearSceneGUI } from "./UserInterfaceModule";
import {
	DoorData,
	Interactable as Interactable,
	NewLocationSceneParams,
	SceneLocation,
} from "src/types/GameTypes";
import {
	EventState,
	TransformNode,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { Button, Control, Vector2WithInfo } from "@babylonjs/gui";
import { getPublicRoot } from "./Utils";
import { BASE_MOVEMENT_SPEED } from "src/constants/GeneralConstants";
import { addComponent, set } from "bitecs";
import { getSceneNodes, getViewPositionNode } from "./SceneModule";
import {
	getControlState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { resetExploreViewPosition } from "./CameraModule";
import EntityMovementComponent from "src/components/EntityMovementComponent";
import { getEntityMovementComponentArray } from "./ComponentModule";
import { startDialogue } from "./DialogueModule";
import { checkEventByTrigger } from "./EventModule";

export async function loadLocation(
	locationId: string,
	newLocationSceneParams: NewLocationSceneParams,
): Promise<SceneLocation> {
	await clearSceneGUI();
	newLocationSceneParams.exploreGUIControls.length = 0;

	const locationData = newLocationSceneParams.gameScene.locations.find(
		(location) => location.id === locationId,
	);

	if (!locationData) {
		throw new Error("No location data found!");
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
	const sceneNodes = await getSceneNodes(
		newLocationSceneParams.gameScene.mapModelId,
	);
	const interactableNode = sceneNodes.find(
		(sceneNode) => sceneNode.id == interactable.interactableNodeId,
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
	return async () => {
		setLastExploreViewTarget();
		const viewPositionNode = await getViewPositionNode(
			interactable.viewPositionNodeId,
		);

		if (viewPositionNode) {
			startDialogue(interactable.dialogueNodeId, {
				interactablePositionNode: interactableNode,
				viewPositionNode,
			});
		}
	};
}

function setLastExploreViewTarget() {
	const gameScene = getGameScene();
	const currCamera = gameScene.activeCamera as UniversalCamera;
	if (currCamera) {
		gameScene.lastExploreViewTarget = currCamera.getTarget();
	}
}

function enableHighlightInfoUIFunction(
	interactable: Interactable,
): (eventData: Control, eventState: EventState) => void {
	return () => {
		const userInterfaceState = getUserInterfaceState();
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
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.exploreHud.hideHighlightInfoUI();
	};
}

export async function filterLocationEvents(locationData: SceneLocation) {
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
	const userInterfaceState = getUserInterfaceState();

	await resetExploreViewPosition();
	userInterfaceState.exploreHud.hideHighlightInfoUI();
	const sceneGUIChildren = userInterfaceState.sceneGUI.getChildren();
	for (let i = 0; i < sceneGUIChildren.length; i++) {
		const sceneGUIObject = sceneGUIChildren[i];
		sceneGUIObject.isVisible = true;
	}
	checkEventByTrigger("OnLocationEnter");
}
export async function transitionToNewLocation(
	currentLocationViewNode: TransformNode,
	destinationId: string,
) {
	const gameScene = getGameScene();
	const sceneNodes = await getSceneNodes(gameScene.mapModelId);
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	const newLocationSceneParams = {
		gameScene: gameScene,
		sceneGUI: userInterfaceState.sceneGUI,
		exploreGUIControls: controlState.exploreGUIControls,
	} as NewLocationSceneParams;
	const newLocation = await loadLocation(
		destinationId,
		newLocationSceneParams,
	);

	if (!newLocation) {
		return;
	}

	const currCamera = gameScene.activeCamera as UniversalCamera;
	if (currCamera) {
		gameScene.lastExploreViewTarget =
			currentLocationViewNode.absolutePosition;
	}

	gameScene.currentLocation = newLocation;

	let cameraTransformNode = currCamera.parent;
	if (!cameraTransformNode) {
		const newTransformNode = new TransformNode("activeCamNode");
		newTransformNode.setAbsolutePosition(currCamera.position);
		currCamera.parent = newTransformNode;
		currCamera.position = Vector3.Zero();
		cameraTransformNode = newTransformNode;
	}

	const sceneGUIChildren = userInterfaceState.sceneGUI.getChildren();
	for (let i = 0; i < sceneGUIChildren.length; i++) {
		const sceneGUIObject = sceneGUIChildren[i];
		sceneGUIObject.isVisible = false;
	}

	const viewNode = sceneNodes.find(
		(x) => x.id === newLocation.exploreViewNodeId,
	) as TransformNode;
	const entityMovement = new EntityMovementComponent(
		cameraTransformNode as TransformNode,
		viewNode.position,
		BASE_MOVEMENT_SPEED,
		async () => {
			finishTransitionToNewLocation();
		},
	);
	const entityMovementComponentArray = getEntityMovementComponentArray();
	addComponent(
		gameScene.world,
		gameScene.cameraEntityId,
		set(entityMovementComponentArray, entityMovement),
	);
}
export async function loadLocationDoor(
	doorData: DoorData,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const sceneNodes = await getSceneNodes(
		newLocationSceneParams.gameScene.mapModelId,
	);
	const sceneNode = sceneNodes.find((x) => x.id == doorData.id);

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
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.exploreHud.updateHighlightInfoUI(
			`Head To ${doorData.destination}`,
			doorData.destination,
		);
	});
	button.onPointerOutObservable.add(() => {
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.exploreHud.hideHighlightInfoUI();
	});
	button.onPointerClickObservable.add(async () => {
		transitionToNewLocation(sceneNode, doorData.destination);
	});
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(sceneNode);
}
