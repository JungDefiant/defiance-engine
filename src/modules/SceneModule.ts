import { container } from "tsyringe";
import "@babylonjs/loaders/glTF";
import {
	Color3,
	CreateAudioEngineAsync,
	Engine,
	HemisphericLight,
	ImportMeshAsync,
	MeshBuilder,
	StandardMaterial,
	UniversalCamera,
	Vector3,
	Viewport,
} from "@babylonjs/core";
import {
	resetCombatModeActionManager,
	resetCombatModeControls,
	resetDialogueModeControls,
	resetExploreModeActionManager,
	resetExploreModeControls,
} from "./ControlModule";
import {
	resetCombatViewPosition,
	resetExploreViewPosition,
} from "./CameraModule";
import {
	getCampaignState,
	getControlState,
	getGameScene,
	getGameStateRegistry,
	getUserInterfaceScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { getPublicRoot } from "./Utils";
import {
	GameMode,
	LoadedSceneJson,
	NewLocationSceneParams,
} from "src/types/GameTypes";
import { GameScene, GameSceneProps } from "src/scenes/GameScene";
import { Themes } from "src/gui/Themes";
import {
	DEFAULT_CAM_FOCALLENGTH,
	DEFAULT_CAM_TARGET,
} from "src/constants/GeneralConstants";
import TransformNodeComponent from "src/components/TransformNodeComponent";
import { addComponent, addEntity, EntityId, set } from "bitecs";
import {
	createUserInterfaceState,
	loadModalMap,
	setUserInterfaceGameMode,
} from "./UserInterfaceModule";
import { loadStartingPlayerParty } from "./CharacterModule";
import { playMusic } from "./AudioModule";
import GameplayState from "src/states/GameplayState";
import { loadLocation } from "./LocationModule";
import { initSemantics, loadDialogueMap } from "./DialogueModule";
import AudioState from "src/states/AudioState";
import { UserInterfaceScene } from "src/scenes/UserInterfaceScene";
import {
	registerComponentArrays,
	registerFactories,
	registerStates,
	registerSystems,
	startFactories,
} from "./InitModule";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { ComponentRegistry } from "src/registries/ComponentRegistry";

export async function initGameScene(sceneId: string) {
	const engine = container.resolve(Engine);
	const newGameScene = await createGameScene(sceneId, engine);
	newGameScene.lastExploreViewTarget = DEFAULT_CAM_TARGET;
	createUserInterfaceScene(engine);

	createSkybox(newGameScene);
	createSceneLight(newGameScene);

	const newSystemRegistry = new SystemRegistry();
	container.register(SystemRegistry, { useValue: newSystemRegistry });
	const newFactoryRegistry = new FactoryRegistry();
	container.register(FactoryRegistry, { useValue: newFactoryRegistry });
	const newGameStateRegistry = new GameStateRegistry();
	container.register(GameStateRegistry, { useValue: newGameStateRegistry });
	const newComponentRegistry = new ComponentRegistry(newGameScene.world);
	container.register(ComponentRegistry, { useValue: newComponentRegistry });

	registerFactories(newFactoryRegistry);
	registerSystems(newSystemRegistry, newGameScene);
	await registerStates(newGameStateRegistry, newGameScene);
	registerComponentArrays(newComponentRegistry);
	await startFactories(newFactoryRegistry);

	createUserInterfaceState();
	await loadStartingPlayerParty();
	await loadModalMap(newGameScene.modalIds);

	await initSemantics();
	await loadDialogueMap(newGameScene.dialogueFileId);

	newGameScene.cameraEntityId = createSceneCamera(newGameScene);
	await createStartingLocation(newGameScene);
	await playMusic(newGameScene.startMusicId);
	setExploreGameMode();
}

async function createStartingLocation(gameScene: GameScene) {
	const userInterfaceState = getUserInterfaceState();
	const controlState = getControlState();
	const newLocationSceneParams = {
		gameScene,
		sceneGUI: userInterfaceState.sceneGUI,
		exploreGUIControls: controlState.exploreGUIControls,
	} as NewLocationSceneParams;
	const location = await loadLocation(
		gameScene.startLocationId,
		newLocationSceneParams,
	);
	gameScene.currentLocation = location;
}

export function initGameplayState(cameraEntityId: EntityId) {
	const newGameplayState = new GameplayState();
	newGameplayState.cameraEntityId = cameraEntityId;
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
		startLocationId: sceneJson.startLocationId,
		mapModelId: sceneJson.mapModelId,
		difficultyLevel: sceneJson.difficultyLevel,
		startMusicId: sceneJson.startMusicId,
		dialogueFileId: sceneJson.dialogueFileId,
		encounters: sceneJson.encounters,
		locations: sceneJson.locations,
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

export async function getSceneNode(sceneNodeId: string) {
	const gameSceneNodes = await getSceneNodes(getGameScene().mapModelId);
	const sceneNode = gameSceneNodes.find((x) => x.id === sceneNodeId);
	return sceneNode;
}

export function setExploreGameMode() {
	setUserInterfaceGameMode("Explore");
	Promise.resolve(resetExploreViewPosition());
	resetExploreModeControls();
	resetExploreModeActionManager();
}

export function setCombatGameMode() {
	setUserInterfaceGameMode("Combat");
	Promise.resolve(resetCombatViewPosition());
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

export function createSceneCamera(scene: GameScene): EntityId {
	const gameCanvas = getGameCanvas();

	if (gameCanvas) {
		const camera = new UniversalCamera(
			"cam_explore",
			Vector3.Zero(),
			scene,
		);
		camera.setFocalLength(DEFAULT_CAM_FOCALLENGTH);
		camera.setTarget(DEFAULT_CAM_TARGET);
		camera.minZ = 0;
		camera.viewport = new Viewport(0, 0.1, 1, 1);
		camera.inputs.clear();
		camera.inputs.addMouse();
		camera.attachControl();
		scene.onPointerObservable.add((eventData) => {
			// This will block out vertical rotation
			// For blocking out horizontal rotation, simply use y instead of x
			camera.cameraRotation.x = 0;
		});

		const newCameraEntityId = addEntity(scene.world);
		addComponent(scene.world, newCameraEntityId, camera);

		return newCameraEntityId;
	}

	throw Error("No game canvas found!");
}

export async function getSceneNodes(mapModelId: string) {
	const scene = getGameScene();
	if (!scene.sceneNodes) {
		const loadingMesh = await ImportMeshAsync(
			`${getPublicRoot()}/models/maps/${mapModelId}`,
			scene,
			{
				pluginOptions: {},
			},
		);
		scene.sceneNodes = loadingMesh.transformNodes;
	}
	return scene.sceneNodes;
}
