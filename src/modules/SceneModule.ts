import { container } from "tsyringe";
import "@babylonjs/loaders/glTF";
import {
	Color3,
	CreateAudioEngineAsync,
	Engine,
	EventState,
	HemisphericLight,
	MeshBuilder,
	PointerEventTypes,
	StandardMaterial,
	UniversalCamera,
	Vector3,
	Viewport,
} from "@babylonjs/core";
import { Button, Control, Vector2WithInfo } from "@babylonjs/gui";
import {
	resetCombatModeActionManager,
	resetCombatModeControls,
	resetDialogueModeControls,
	resetExploreModeActionManager,
	resetExploreModeControls,
} from "./ControlModule";
import {
	getCampaignState,
	getControlState,
	getGameScene,
	getGameStateRegistry,
	getGameplayState,
	getUserInterfaceScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { getPublicRoot } from "./Utils";
import { DoorData, Interactable, LoadedSceneJson } from "src/types/GameTypes";
import { GameScene, GameSceneProps } from "src/scenes/GameScene";
import { Themes } from "src/gui/Themes";
import {
	DEFAULT_CAM_TARGET,
	ISO_CAM_OFFSET,
} from "src/constants/GeneralConstants";
import {
	createUserInterfaceState,
	loadModalMap,
	setUserInterfaceGameMode,
} from "./UserInterfaceModule";
import { loadStartingPlayerParty } from "./CharacterModule";
import { playMusic } from "./AudioModule";
import GameplayState from "src/states/GameplayState";
import {
	initSemantics,
	loadDialogueMap,
	startDialogue,
} from "./DialogueModule";
import AudioState from "src/states/AudioState";
import { UserInterfaceScene } from "src/scenes/UserInterfaceScene";
import {
	registerComponentArrays,
	registerFactories,
	registerProcessorArrays as registerProcessors,
	registerStates,
	registerSystems,
	startFactories,
} from "./InitModule";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { ProcessorRegistry } from "src/registries/ProcessorRegistry";
import { initNavigation, navigateToPosition } from "./ActorNavigationModule";
import { createEnvironment } from "./EnvironmentModule";
import { checkEventByTrigger, filterSceneEvents } from "./EventModule";

export async function initGameScene(sceneId: string) {
	const engine = container.resolve(Engine);
	const newGameScene = await createGameScene(sceneId, engine);
	createUserInterfaceScene(engine);

	const newSystemRegistry = new SystemRegistry();
	container.register(SystemRegistry, { useValue: newSystemRegistry });
	const newFactoryRegistry = new FactoryRegistry();
	container.register(FactoryRegistry, { useValue: newFactoryRegistry });
	const newProcessorRegistry = new ProcessorRegistry();
	container.register(ProcessorRegistry, { useValue: newProcessorRegistry });
	const newGameStateRegistry = new GameStateRegistry();
	container.register(GameStateRegistry, { useValue: newGameStateRegistry });
	const newComponentRegistry = new ComponentRegistry(newGameScene.world);
	container.register(ComponentRegistry, { useValue: newComponentRegistry });

	registerFactories(newFactoryRegistry);
	registerSystems(newSystemRegistry, newGameScene);
	await registerStates(newGameStateRegistry);
	registerComponentArrays(newComponentRegistry);
	registerProcessors(newProcessorRegistry);
	await startFactories(newFactoryRegistry);

	createUserInterfaceState();
	await loadStartingPlayerParty();
	await loadModalMap(newGameScene.modalIds);

	await initSemantics();
	await loadDialogueMap(newGameScene.dialogueFileId);

	createSceneCamera(newGameScene);
	await createSceneInteractiveElements(newGameScene);
	await playMusic(newGameScene.startMusicId);

	// The environment must exist before the navmesh is generated, since its
	// meshes (floor, walls, pillars, crates) are the navmesh geometry source.
	createSkybox(newGameScene);
	createSceneLight(newGameScene);
	createEnvironment(newGameScene);

	await initNavigation(newGameScene);

	setExploreGameMode();
	checkEventByTrigger("OnSceneEnter");
}

async function createSceneInteractiveElements(gameScene: GameScene) {
	filterSceneEvents(gameScene.events);

	for (const interactable of gameScene.interactables) {
		await createSceneInteractable(interactable);
	}

	for (const door of gameScene.doors) {
		await createSceneDoor(door);
	}
}

export async function createSceneInteractable(interactable: Interactable) {
	const interactableNode = await getSceneNode(
		interactable.interactableNodeId,
	);

	if (!interactableNode) {
		return;
	}

	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

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
		startDialogueFromInteractableFunction(interactable),
	);
	userInterfaceState.sceneGUI.addControl(button);
	controlState.exploreGUIControls.push(button);
	button.linkWithMesh(interactableNode);
}

function startDialogueFromInteractableFunction(
	interactable: Interactable,
): (eventData: Vector2WithInfo, eventState: EventState) => void {
	return async () => {
		startDialogue(interactable.dialogueNodeId);
	};
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

export async function createSceneDoor(doorData: DoorData) {
	const sceneNode = await getSceneNode(doorData.id);

	if (!sceneNode) {
		return;
	}

	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();

	const button = Button.CreateImageOnlyButton(
		doorData.id,
		`${getPublicRoot()}/sprites/gui/icons/icon_door.png`,
	);
	button.width = 0.1;
	button.height = 0.1;
	button.thickness = 0;
	button.onPointerEnterObservable.add(() => {
		userInterfaceState.exploreHud.updateHighlightInfoUI(
			`Head To ${doorData.destination}`,
			doorData.destination,
		);
	});
	button.onPointerOutObservable.add(() => {
		userInterfaceState.exploreHud.hideHighlightInfoUI();
	});
	button.onPointerClickObservable.add(() => {
		console.warn(
			`Door "${doorData.id}" is inert; location transitions are no longer supported.`,
		);
	});
	userInterfaceState.sceneGUI.addControl(button);
	controlState.exploreGUIControls.push(button);
	button.linkWithMesh(sceneNode);
}

export function initGameplayState() {
	const newGameplayState = new GameplayState();
	getGameStateRegistry().registerNewGameState(
		GameplayState.name,
		newGameplayState,
	);
}

export async function initAudioState() {
	const audioEngine = await CreateAudioEngineAsync({
		disableDefaultUI: true,
	});
	return new AudioState(audioEngine);
}

async function createGameScene(
	sceneId: string,
	engine: Engine,
): Promise<GameScene> {
	const sceneJson = await loadSceneJson(sceneId);
	const gameSceneProps = {
		engine,
		mapModelId: sceneJson.mapModelId,
		difficultyLevel: sceneJson.difficultyLevel,
		startMusicId: sceneJson.startMusicId,
		dialogueFileId: sceneJson.dialogueFileId,
		encounters: sceneJson.encounters,
		interactables: sceneJson.interactables,
		doors: sceneJson.doors,
		events: sceneJson.events,
		modalIds: sceneJson.modalIds,
	} as GameSceneProps;
	const newGameScene = new GameScene(engine, gameSceneProps);
	container.register(GameScene, { useValue: newGameScene });
	return newGameScene;
}

function createUserInterfaceScene(engine: Engine) {
	const newUserInterfaceScene = new UserInterfaceScene(engine);
	container.register(UserInterfaceScene, { useValue: newUserInterfaceScene });
	return newUserInterfaceScene;
}

export async function disposeScenes() {
	getGameScene().dispose();
	getUserInterfaceScene().dispose();
}

export function getGameCanvas(): HTMLCanvasElement {
	const engine = container.resolve(Engine);
	return engine.getRenderingCanvas() as HTMLCanvasElement;
}

export async function getAllSceneNodes() {
	const scene = getGameScene();
	return scene.sceneNodes;
}

export async function getSceneNode(sceneNodeId: string) {
	const gameSceneNodes = (await getAllSceneNodes()) || [];
	const sceneNode = gameSceneNodes.find((x) => x.id === sceneNodeId);
	return sceneNode;
}

export function setExploreGameMode() {
	setUserInterfaceGameMode("Explore");
	resetExploreModeControls();
	resetExploreModeActionManager();
}

export function setCombatGameMode() {
	setUserInterfaceGameMode("Combat");
	resetCombatModeControls();
	resetCombatModeActionManager();
}

export function setDialogueGameMode() {
	setUserInterfaceGameMode("Dialogue");
	resetDialogueModeControls();
}

async function loadSceneJson(sceneId: string): Promise<LoadedSceneJson> {
	const campaignState = getCampaignState();
	const response = await fetch(
		`${getPublicRoot()}/data/${campaignState.campaignId}/scenes/${sceneId}.json`,
	);
	const sceneJson = (await response.json()) as LoadedSceneJson;
	return sceneJson;
}

function createSceneLight(scene: GameScene) {
	const light = new HemisphericLight("light", new Vector3(1, 1, 1), scene);
	light.intensity = 1;
}

function createSkybox(scene: GameScene) {
	const skybox = MeshBuilder.CreateBox("skybox", { size: 100.0 }, scene);
	const skyboxMaterial = new StandardMaterial("skyBox", scene);
	skyboxMaterial.emissiveColor = Color3.FromHexString(Themes.primary3);
	skyboxMaterial.backFaceCulling = true;
	skyboxMaterial.disableLighting = true;
	skybox.material = skyboxMaterial;
	skybox.infiniteDistance = true;
}

export function createSceneCamera(scene: GameScene): void {
	const gameCanvas = getGameCanvas();

	if (!gameCanvas) {
		throw Error("No game canvas found!");
	}

	const initialFocus = DEFAULT_CAM_TARGET;
	const camera = new UniversalCamera(
		"cam_iso",
		initialFocus.add(ISO_CAM_OFFSET),
		scene,
	);
	camera.minZ = 0;
	camera.viewport = new Viewport(0, 0.1, 1, 1);
	camera.inputs.clear();
	camera.setTarget(initialFocus);
	camera.attachControl();
	scene.activeCamera = camera;

	registerScenePointerBindings(scene, gameCanvas);
}

function registerScenePointerBindings(
	scene: GameScene,
	gameCanvas: HTMLCanvasElement,
) {
	gameCanvas.addEventListener("contextmenu", (pointerEvent) => {
		pointerEvent.preventDefault();
	});

	gameCanvas.addEventListener("pointerdown", () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
		}
	});

	scene.onPointerObservable.add((pointerInfo) => {
		const controlState = getControlState();
		const gameplayState = getGameplayState();
		const pointerButton = (pointerInfo.event as PointerEvent).button;

		if (pointerInfo.type === PointerEventTypes.POINTERUP) {
			if (
				pointerButton === controlState.controlSettings.moveMouseButton
			) {
				controlState.isMoveInputHeld = false;
			}
			return;
		}

		if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
			if (!controlState.isMoveInputHeld) {
				return;
			}
			if (
				controlState.controlPauseSet.size > 0 ||
				controlState.actionPauseSet.size > 0
			) {
				return;
			}
			const groundPick = scene.pick(
				scene.pointerX,
				scene.pointerY,
				(mesh) => mesh.name === "env_floor",
			);
			if (groundPick?.hit && groundPick.pickedPoint) {
				navigateToPosition(
					gameplayState.selectedPlayerEID,
					groundPick.pickedPoint,
				);
			}
			return;
		}

		if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) {
			return;
		}

		if (
			controlState.controlPauseSet.size > 0 ||
			controlState.actionPauseSet.size > 0
		) {
			return;
		}

		if (pointerButton === controlState.controlSettings.targetMouseButton) {
			const enemyPick = scene.pick(
				scene.pointerX,
				scene.pointerY,
				(mesh) => mesh.name.startsWith("enBattlerSprite_"),
			);
			if (enemyPick?.hit && enemyPick.pickedMesh) {
				const pickedEntityId = (
					enemyPick.pickedMesh.metadata as
						| Record<string, number>
						| undefined
				)?.entityId;
				if (pickedEntityId !== undefined && pickedEntityId >= 0) {
					gameplayState.selectedTargetEID = pickedEntityId;
				}
			}
		} else if (
			pointerButton === controlState.controlSettings.moveMouseButton
		) {
			controlState.isMoveInputHeld = true;
			const groundPick = scene.pick(
				scene.pointerX,
				scene.pointerY,
				(mesh) => mesh.name === "env_floor",
			);
			if (groundPick?.hit && groundPick.pickedPoint) {
				navigateToPosition(
					gameplayState.selectedPlayerEID,
					groundPick.pickedPoint,
				);
			}
		}
	});
}
