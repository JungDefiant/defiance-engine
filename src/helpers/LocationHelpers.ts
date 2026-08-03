import SceneManagerSystem, {
	NewLocationSceneParams,
} from "src/systems/SceneManagerSystem";
import { clearSceneGUI } from "./UserInterfaceHelpers";
import { DoorData, InteractableData, LocationData } from "src/types/GameTypes";
import {
	Nullable,
	TransformNode,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { Button } from "@babylonjs/gui";
import { getPublicRoot } from "./Utils";
import { container } from "tsyringe";
import GameState from "src/states/GameState";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import EventHandlerSystem from "src/systems/EventHandlerSystem";
import { EntityMovementComponent } from "src/components/EntityMovementComponent";
import { BASE_MOVEMENT_SPEED } from "src/Constants";
import { addComponent, set } from "bitecs";

export async function loadLocation(
	locationId: string,
	newLocationSceneParams: NewLocationSceneParams,
): Promise<Nullable<LocationData>> {
	await clearSceneGUI();
	newLocationSceneParams.exploreGUIControls.length = 0;

	const locationData = newLocationSceneParams.sceneData.locations.find(
		(loc) => loc.id === locationId,
	);

	if (
		!locationData ||
		!newLocationSceneParams ||
		!newLocationSceneParams.sceneData ||
		!newLocationSceneParams.sceneNodes
	) {
		return null;
	}

	locationData.interactables.forEach(async (itr) => {
		await loadLocationInteractable(itr, newLocationSceneParams);
	});

	locationData.doors.forEach(async (door) => {
		await loadLocationDoor(door, newLocationSceneParams);
	});

	filterLocationEvents(locationData);

	return locationData;
}

export async function loadLocationInteractable(
	interactableData: InteractableData,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const interactableNode = newLocationSceneParams.sceneNodes.find(
		(x) => x.id == interactableData.interactableNodeId,
	);

	if (!interactableNode) {
		return;
	}

	const button = Button.CreateImageOnlyButton(
		interactableData.id,
		`${getPublicRoot()}/sprites/gui/icons/icon_interact.png`,
	);
	button.width = 0.075;
	button.height = 0.1125;
	button.thickness = 0;
	button.onPointerEnterObservable.add(() => {
		const gameState = container.resolve(GameState);
		gameState.exploreHud.updateHighlightInfoUI(
			interactableData.name,
			interactableData.description,
		);
	});
	button.onPointerOutObservable.add(() => {
		const gameState = container.resolve(GameState);
		gameState.exploreHud.hideHighlightInfoUI();
	});
	button.onPointerClickObservable.add(() => {
		// Loads and runs dialogue based on dialogueId in interactableData
		const gameState = container.resolve(GameState);
		const viewNode = gameState.sceneNodes.find(
			(x) => x.id === interactableData.viewPositionNodeId,
		);

		if (!viewNode) {
			return;
		}

		const currCamera = gameState.scene.activeCamera as UniversalCamera;
		if (currCamera) {
			gameState.lastExploreViewTarget = currCamera.getTarget();
		}

		const dmSystem = container.resolve(DialogueManagerSystem);
		dmSystem.startDialogue(interactableData.dialogueNodeId, {
			itrNode: interactableNode,
			viewNode: viewNode,
		});
	});
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(interactableNode);
}

export async function filterLocationEvents(locationData: LocationData) {
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
