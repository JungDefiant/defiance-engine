import { clearSceneGUI } from "./UserInterfaceModule";
import {
	LocationDoor,
	Interactable as Interactable,
	NewLocationSceneParams,
	SceneLocation,
	Speaker,
} from "src/types/GameTypes";
import {
	EventState,
	MeshBuilder,
	PBRMaterial,
	Space,
	Texture,
	TransformNode,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { Button, Control, Vector2WithInfo } from "@babylonjs/gui";
import { getPublicRoot } from "./Utils";
import {
	BASE_MOVEMENT_SPEED,
	PAUSE_LOCATIONTRANSITION,
} from "src/constants/GeneralConstants";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import { getAllSceneNodes, getSceneNode } from "./SceneModule";
import {
	getControlState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { resetExploreViewPosition } from "./CameraModule";
import EntityMovementComponent from "src/components/EntityMovementComponent";
import {
	getCharacterSpriteComponentArray,
	getEntityMovementComponentArray,
	getTransformNodeComponentArray,
} from "./ComponentModule";
import { startDialogue } from "./DialogueModule";
import { checkEventByTrigger } from "./EventModule";
import {
	attachCameraControl,
	clearControlPause,
	detachCameraControl,
} from "./ControlModule";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";

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

	locationData.speakers.forEach(async (speaker) => {
		await createLocationSpeaker(speaker, newLocationSceneParams);
	});

	locationData.doors.forEach(async (door) => {
		await createLocationDoor(door, newLocationSceneParams);
	});

	filterLocationEvents(locationData);

	return locationData;
}

export async function createLocationInteractable(
	interactable: Interactable,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const interactableNode = await getSceneNode(
		interactable.interactableNodeId,
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
		enableHighlightInfoUIFunction(
			interactable.name,
			interactable.description,
		),
	);
	button.onPointerOutObservable.add(disableHighlightInfoUIFunction());
	button.onPointerClickObservable.add(
		startDialogueFromInteractableFunction(interactable, interactableNode),
	);
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(interactableNode);
}

export async function createLocationSpeaker(
	speaker: Speaker,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const speakerNode = await getSceneNode(speaker.sceneNodeId);

	if (!speakerNode) {
		return;
	}

	const newSpeakerEntity = addEntity(newLocationSceneParams.gameScene.world);
	const newSpeakerSprite = createSpeakerSprite(
		newSpeakerEntity,
		speakerNode,
		speaker,
	);
	addComponent(
		newLocationSceneParams.gameScene.world,
		newSpeakerEntity,
		set(getCharacterSpriteComponentArray(), newSpeakerSprite),
	);

	const button = Button.CreateImageOnlyButton(
		speaker.id,
		`${getPublicRoot()}/sprites/gui/icons/icon_interact.png`,
	);
	button.width = 0.075;
	button.height = 0.1125;
	button.thickness = 0;
	button.onPointerEnterObservable.add(
		enableHighlightInfoUIFunction(speaker.name, speaker.description),
	);
	button.onPointerOutObservable.add(disableHighlightInfoUIFunction());
	button.onPointerClickObservable.add(() =>
		startDialogue(speaker.dialogueNodeId),
	);
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(newSpeakerSprite.getValue());
}

function createSpeakerSprite(
	entityId: EntityId,
	parentNode: TransformNode,
	speaker: Speaker,
): CharacterSpriteComponent {
	const gameScene = getGameScene();

	// Need to create this sprite as a CharacterSpriteComponent
	const speakerSprite = MeshBuilder.CreatePlane(
		`speakerSprite_${entityId}`,
		{
			width: 0.4,
			height: 0.8,
		},
		gameScene,
	);

	const speakerSpriteMaterial = new PBRMaterial(
		`mat_speakerSprite_${entityId}`,
		gameScene,
	);
	speakerSprite.parent = parentNode;
	speakerSprite.billboardMode = 7;
	speakerSprite.rotate(Vector3.Forward(), Math.PI, Space.WORLD);
	speakerSprite.setAbsolutePosition(
		parentNode.absolutePosition.addInPlaceFromFloats(
			speaker.speakerPositionOffset[0],
			speaker.speakerPositionOffset[1],
			speaker.speakerPositionOffset[2],
		),
	);

	speakerSpriteMaterial.albedoTexture = new Texture(
		`${getPublicRoot()}/sprites/characters/${speaker.spriteKey}`,
		gameScene,
	);
	speakerSpriteMaterial.metallic = 0;
	speakerSpriteMaterial.roughness = 0;
	speakerSpriteMaterial.alphaCutOff = 0.4;
	speakerSpriteMaterial.transparencyMode = 1;
	speakerSpriteMaterial.useAlphaFromAlbedoTexture = true;

	speakerSprite.material = speakerSpriteMaterial;

	const characterSpriteComponent = new CharacterSpriteComponent(
		speakerSprite,
		`speaker_${speaker.name.toLowerCase()}`,
	);
	return characterSpriteComponent;
}

function startDialogueFromInteractableFunction(
	interactable: Interactable,
	interactableNode: TransformNode,
): (eventData: Vector2WithInfo, eventState: EventState) => void {
	return async () => {
		setLastExploreViewTarget();
		const viewPositionNode = await getSceneNode(
			interactable.viewPositionNodeId,
		);

		if (viewPositionNode) {
			startDialogue(interactable.dialogueNodeId, {
				objectPositionNode: interactableNode,
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
	highlightName: string,
	highlightDescription: string,
): (eventData: Control, eventState: EventState) => void {
	return () => {
		const userInterfaceState = getUserInterfaceState();
		userInterfaceState.exploreHud.updateHighlightInfoUI(
			highlightName,
			highlightDescription,
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
	locationData.events.forEach((event, index) => {
		const eventKey = `${event.trigger}_${event.type}_${event.condition}`;
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

export function finishTransitionToNewLocation() {
	const userInterfaceState = getUserInterfaceState();

	Promise.resolve(resetExploreViewPosition());
	userInterfaceState.exploreHud.hideHighlightInfoUI();
	const sceneGUIChildren = userInterfaceState.sceneGUI.getChildren();
	for (let i = 0; i < sceneGUIChildren.length; i++) {
		const sceneGUIObject = sceneGUIChildren[i];
		sceneGUIObject.isVisible = true;
	}
	checkEventByTrigger("OnLocationEnter");
}
export async function transitionToNewLocation(destinationId: string) {
	const gameScene = getGameScene();
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

	gameScene.currentLocation = newLocation;

	const sceneGUIChildren = userInterfaceState.sceneGUI.getChildren();
	for (let i = 0; i < sceneGUIChildren.length; i++) {
		const sceneGUIObject = sceneGUIChildren[i];
		sceneGUIObject.isVisible = false;
	}

	const viewNode = await getSceneNode(newLocation.exploreViewNodeId);
	if (viewNode && gameScene.activeCamera) {
		detachCameraControl();
		setLastExploreViewTarget();
		controlState.controlPauseSet.add(PAUSE_LOCATIONTRANSITION);
		const camera = gameScene.activeCamera as UniversalCamera;
		camera.target = viewNode.getPositionExpressedInLocalSpace();
		const entityMovement = new EntityMovementComponent(
			camera.position,
			viewNode.getPositionExpressedInLocalSpace(),
			BASE_MOVEMENT_SPEED,
			() => {
				attachCameraControl();
				clearControlPause();
				finishTransitionToNewLocation();
				camera.target = gameScene.lastExploreViewTarget;
			},
		);
		const entityMovementComponentArray = getEntityMovementComponentArray();
		addComponent(
			gameScene.world,
			gameScene.cameraEntityId,
			set(entityMovementComponentArray, entityMovement),
		);
	}
}
export async function createLocationDoor(
	doorData: LocationDoor,
	newLocationSceneParams: NewLocationSceneParams,
) {
	const sceneNode = await getSceneNode(doorData.id);

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
	button.onPointerClickObservable.add(() => {
		Promise.resolve(transitionToNewLocation(doorData.destination));
	});
	newLocationSceneParams.sceneGUI.addControl(button);
	newLocationSceneParams.exploreGUIControls.push(button);
	button.linkWithMesh(sceneNode);
}
