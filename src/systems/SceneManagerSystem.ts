import { container, inject, singleton } from "tsyringe";
import GameSystem from "src/systems/GameSystem";
import {
	addComponent,
	addEntity,
	createWorld,
	deleteWorld,
	EntityId,
	getComponent,
	query,
	set,
	World,
} from "bitecs";
import {
	Engine,
	HemisphericLight,
	Scene,
	Vector3,
	ImportMeshAsync,
	AbstractMesh,
	MeshBuilder,
	StandardMaterial,
	Color3,
	UniversalCamera,
	Nullable,
	Viewport,
	Texture,
	TransformNode,
	ActionManager,
	ExecuteCodeAction,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui";
import "@babylonjs/loaders";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import UserInterfaceSystem, {
	SYSTEM_ID_USERINTERFACE,
} from "src/systems/UserInterfaceSystem";
import { CreateTypography, Themes } from "src/gui/Themes";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import CombatHUD from "src/gui/CombatHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import {
	DEFAULT_CAM_FOCALLENGTH,
	DEFAULT_CAM_TARGET,
	DELTATIME_MS,
	PAUSE_TACTICALPAUSE,
} from "src/constants/GeneralConstants";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { App } from "src/App";
import {
	CampaignData,
	DoorData,
	GameMode,
	Interactable,
	Location,
	ModalData,
	SceneData as LoadedSceneJson,
} from "src/types/GameTypes";
import { getPublicRoot } from "src/helpers/Utils";
import { VictoryScreen } from "src/gui/screens/VictoryScreen";
import { ModalScreen } from "src/gui/screens/ModalScreen";
import { playMusic } from "src/helpers/AudioHelpers";
import { loadLocation as createLocation } from "src/helpers/LocationHelpers";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import SceneState, { SceneStateProps } from "src/states/SceneState";
import CampaignState from "src/states/CampaignState";
import UserInterfaceState, {
	UserInterfaceStateProps,
} from "src/states/UserInterfaceState";
import GameplayState, { GameplayStateProps } from "src/states/GameplayState";
import ControlState from "src/states/ControlState";

export interface NewLocationSceneParams {
	sceneState: SceneState;
	sceneGUI: AdvancedDynamicTexture;
	exploreGUIControls: Control[];
}

export default class SceneManagerSystem implements GameSystem {
	private gameCanvas: Nullable<HTMLCanvasElement> = null;

	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start() {
		this.gameCanvas = document.getElementById(
			"gameCanvas",
		)! as HTMLCanvasElement;
	}

	public update(deltaTime: number) {}

	public debug(debugOn: boolean = true) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);

		if (debugOn) {
			sceneState.currentScene.debugLayer.show({ overlay: true });
		} else {
			sceneState.currentScene.debugLayer.hide();
		}
	}

	public setGameMode(newMode: GameMode) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				STATE_ID_USERINTERFACE,
			);
		const userInterfaceSystem =
			this.systemRegistry.getGameSystemBySystemId<UserInterfaceSystem>(
				SYSTEM_ID_USERINTERFACE,
			);

		userInterfaceSystem.setGameMode(newMode);
		gameplayState.gameMode = newMode;

		if (newMode == GameMode.MainMenu) {
			// X
		} else if (newMode == GameMode.Explore) {
			const camera = sceneState.currentScene
				.activeCamera as UniversalCamera;

			if (!camera) {
				return;
			}

			camera.attachControl(this.gameCanvas);
			sceneState.currentScene.onPointerObservable.add(() => {
				// This will block out vertical rotation
				// For blocking out horizontal rotation, simply use y instead of x
				camera.cameraRotation.x = 0;
			});
			userInterfaceState.sceneGUI.rootContainer.isVisible = true;
			controlState.exploreGUIControls.forEach((child) => {
				child.isVisible = true;
			});
			this.resetViewPosition();
			this.resetControls();
		} else if (newMode == GameMode.Dialogue) {
			const camera = sceneState.currentScene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			userInterfaceState.sceneGUI.rootContainer.isVisible = false;
		} else if (newMode == GameMode.Combat) {
			const camera = sceneState.currentScene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			userInterfaceState.sceneGUI.rootContainer.isVisible = true;
			controlState.exploreGUIControls.forEach((child) => {
				child.isVisible = false;
			});
			this.resetViewPosition();
		}
	}

	async loadPlayerParty(partyCharacterIds: string[]) {
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				GameplayState.toString(),
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);

		const playerEids: number[] = [];
		for (let i = 0; i < partyCharacterIds.length; i++) {
			playerEids.push(
				await this.loadPlayerCharacter(
					partyCharacterIds[i],
					campaignState.campaignId,
				),
			);
		}

		gameplayState.playerEIDs = playerEids;
		gameplayState.selectedPlayerEID = playerEids[0];
		userInterfaceState.partyInfoHud.setPartyInfoEntryStack();
	}

	private async loadSceneJson(sceneId: string): Promise<LoadedSceneJson> {
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);
		const response = await fetch(
			`${getPublicRoot()}/data/${campaignState.campaignId}/scenes/${sceneId}.json`,
		);
		const sceneJson = (await response.json()) as LoadedSceneJson;
		return sceneJson;
	}

	public async createNewScene(sceneId: string) {
		const engine = container.resolve(Engine);
		const sceneState = await this.initSceneState(sceneId, engine);
		this.initUserInterfaceState(sceneState.currentScene);
		this.initGameplayState(sceneState.cameraEntityId);
		this.loadPlayerParty(characterIds);
		await this.createStartingLocation(sceneState);
		await this.initDialogueSystem(sceneState.dialogueFileId);
		await this.loadModalMap(sceneState.modalIds);
		await playMusic(sceneState.startMusicId);
		this.setGameMode(GameMode.Explore);
	}

	private async createStartingLocation(sceneState: SceneState) {
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				UserInterfaceState.toString(),
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				ControlState.toString(),
			);
		const newLocationSceneParams = {
			sceneState,
			sceneGUI: userInterfaceState.sceneGUI,
			exploreGUIControls: controlState.exploreGUIControls,
		} as NewLocationSceneParams;
		const location = await createLocation(
			sceneState.startLocationId,
			newLocationSceneParams,
		);
		sceneState.currentLocation = location;
	}

	private async initDialogueSystem(dialogueFileId: string) {
		const dmSystem = container.resolve(DialogueManagerSystem);
		await dmSystem.initSemantics();
		await dmSystem.loadDialogueMap(dialogueFileId);
	}

	private initGameplayState(cameraEntityId: EntityId) {
		const newGameplayState = new GameplayState({
			gameMode: GameMode.Explore,
			cameraEID: cameraEntityId,
			selectedPlayerEID: 0,
		} as GameplayStateProps);
		this.gameStateRegistry.registerNewGameState(
			GameplayState.toString(),
			newGameplayState,
		);
	}

	private async initSceneState(sceneId: string, engine: Engine) {
		const sceneJson = await this.loadSceneJson(sceneId);
		const world = createWorld();
		const scene = new Scene(engine);
		const sceneNodes = await this.getSceneNodes(
			sceneJson.mapModelId,
			scene,
		);
		const newCameraEntityId = this.createSceneCamera(scene, world);
		this.createSkybox(scene);
		this.createSceneLight(scene);
		const newSceneState = new SceneState({
			engine,
			world,
			scene,
			sceneNodes,
			cameraEntityId: newCameraEntityId,
			startLocationId: sceneJson.startLocationId,
			mapModelId: sceneJson.mapModelId,
			difficultyLevel: sceneJson.difficultyLevel,
			startMusicId: sceneJson.startMusicId,
			dialogueFileId: sceneJson.dialogueFileId,
			encounters: sceneJson.encounters,
			locations: sceneJson.locations,
			modalIds: sceneJson.modalIds,
		} as SceneStateProps);
		newSceneState.lastExploreViewTarget = DEFAULT_CAM_TARGET;
		return newSceneState;
	}

	private initUserInterfaceState(scene: Scene) {
		const engine = container.resolve(Engine);
		const sceneUI = this.createSceneUI(scene);
		const uiScene = this.createUIScene(engine);
		const mainUI = this.createMainUI(uiScene);
		this.CreateUICamera(uiScene);
		CreateTypography(mainUI);
		document.fonts.ready.then(() => {
			mainUI.markAsDirty();
		});
		document.fonts.ready.then(() => {
			sceneUI.markAsDirty();
		});
		const exploreHud = this.createExploreHUD(mainUI);
		const combatHud = this.createCombatHUD(mainUI);
		const tacticalPauseScreen = this.createTacticalPauseScreen(mainUI);
		const partyInfoHud = this.createPartyInfoHUD(mainUI);
		const dialogueHud = this.createDialogueHUD(mainUI);
		const modalScreen = this.createModalScreen(mainUI);
		const gameOverScreen = this.createGameOverScreen(mainUI);
		const victoryScreen = this.createVictoryScreen(mainUI);
		const newUserInterfaceState = new UserInterfaceState({
			mainUI,
			sceneUI,
			exploreHud,
			combatHud,
			tacticalPauseScreen,
			partyInfoHud,
			dialogueHud,
			modalScreen,
			gameOverScreen,
			victoryScreen,
		} as UserInterfaceStateProps);
		this.gameStateRegistry.registerNewGameState(
			UserInterfaceState.toString(),
			newUserInterfaceState,
		);
		return newUserInterfaceState;
	}

	private createVictoryScreen(mainUI: AdvancedDynamicTexture) {
		const victoryScreen = new VictoryScreen();
		mainUI.addControl(victoryScreen.getRoot());
		victoryScreen.showHide(false);
		return victoryScreen;
	}

	private createGameOverScreen(mainUI: AdvancedDynamicTexture) {
		const gameOverScreen = new GameOverScreen();
		mainUI.addControl(gameOverScreen.getRoot());
		gameOverScreen.showHide(false);
		return gameOverScreen;
	}

	private createModalScreen(mainUI: AdvancedDynamicTexture) {
		const modalScreen = new ModalScreen();
		mainUI.addControl(modalScreen.getRoot());
		return modalScreen;
	}

	private createDialogueHUD(mainUI: AdvancedDynamicTexture) {
		const dialogueHud = new DialogueHUD();
		mainUI.addControl(dialogueHud.createHudRoot());
		dialogueHud.showHideHud(false);
		return dialogueHud;
	}

	private createPartyInfoHUD(mainUI: AdvancedDynamicTexture) {
		const partyInfoHud = new PartyInfoHUD();
		mainUI.addControl(partyInfoHud.createHudRoot());
		return partyInfoHud;
	}

	private createTacticalPauseScreen(mainUI: AdvancedDynamicTexture) {
		const tacticalPauseScreen = new TacticalPauseScreen();
		mainUI.addControl(tacticalPauseScreen.getRoot());
		tacticalPauseScreen.showHide(false);
		return tacticalPauseScreen;
	}

	private createCombatHUD(mainUI: AdvancedDynamicTexture) {
		const combatHud = new CombatHUD();
		mainUI.addControl(combatHud.createHudRoot());
		combatHud.showHideHud(false);
		return combatHud;
	}

	private createExploreHUD(mainUI: AdvancedDynamicTexture) {
		const exploreHud = new ExploreHUD();
		mainUI.addControl(exploreHud.createHudRoot());
		exploreHud.showHideHud(false);
		return exploreHud;
	}

	private createUIScene(engine: Engine) {
		const uiScene = new Scene(engine);
		uiScene.autoClear = false;
		return uiScene;
	}

	private async getSceneNodes(mapModelId: string, scene: Scene) {
		return (
			await ImportMeshAsync(
				`${getPublicRoot()}/models/maps/${mapModelId}`,
				scene,
			)
		).transformNodes;
	}

	private CreateUICamera(uiScene: Scene) {
		return new UniversalCamera("cam_gui", Vector3.Zero(), uiScene);
	}

	private createSceneUI(scene: Scene) {
		const sceneGUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_scene",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);
		sceneGUI.idealWidth = 800;
		sceneGUI.idealHeight = 600;
		return sceneGUI;
	}

	private createMainUI(uiScene: Scene) {
		const mainUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			uiScene,
			Texture.NEAREST_SAMPLINGMODE,
		);
		mainUI.idealWidth = 800;
		mainUI.idealHeight = 600;
		return mainUI;
	}

	private createSceneLight(scene: Scene) {
		const light = new HemisphericLight(
			"light",
			new Vector3(1, 1, 1),
			scene,
		);
		light.intensity = 1;
	}

	private createSkybox(scene: Scene) {
		const skybox = MeshBuilder.CreateBox("skybox", { size: 100.0 }, scene);
		const skyboxMaterial = new StandardMaterial("skyBox", scene);
		skyboxMaterial.emissiveColor = Color3.FromHexString(Themes.primary3);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;
	}

	private createSceneCamera(scene: Scene, world: World<{}>) {
		const camera = new UniversalCamera(
			"cam_explore",
			Vector3.Zero(),
			scene,
		);
		camera.setFocalLength(DEFAULT_CAM_FOCALLENGTH);
		camera.setTarget(DEFAULT_CAM_TARGET);
		camera.position = new Vector3(0, 0.4, 0);
		camera.minZ = 0;
		camera.viewport = new Viewport(0, 0.1, 1, 1);
		camera.inputs.clear();
		camera.inputs.addMouse();
		camera.attachControl(this.gameCanvas, false);
		scene.onPointerObservable.add((eventData) => {
			// This will block out vertical rotation
			// For blocking out horizontal rotation, simply use y instead of x
			camera.cameraRotation.x = 0;
		});
		const newCameraEntityId = addEntity(world);
		addComponent(world, newCameraEntityId, camera);
		return newCameraEntityId;
	}

	public async disposeScene() {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		sceneState.currentScene.dispose();
		sceneState.uiScene.dispose();
		deleteWorld(sceneState.world);
	}

	public checkEventTriggers() {}

	public resetViewPosition() {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);

		if (!sceneState.currentLocation) {
			console.warn("NO LOCATION DATA");
			return;
		}

		const camera = sceneState.currentScene.activeCamera as UniversalCamera;
		const locData = sceneState.currentLocation;
		const sceneNodes = sceneState.sceneNodes;

		let viewNodeId = "";
		let camTarget = DEFAULT_CAM_TARGET;
		switch (gameplayState.gameMode) {
			case GameMode.Explore:
				viewNodeId = locData.exploreViewNodeId;
				if (sceneState.lastExploreViewTarget !== Vector3.Zero()) {
					camTarget = sceneState.lastExploreViewTarget;
					camTarget.y = DEFAULT_CAM_TARGET.y;
				}
				break;
			case GameMode.Combat:
				viewNodeId = locData.combatViewNodeId;
				let spawnNode = sceneNodes.find(
					(x) => x.id === locData.combatSpawnNodeId,
				);
				if (spawnNode) {
					camTarget = new Vector3(
						spawnNode.absolutePosition.x,
						0.2,
						spawnNode.absolutePosition.z,
					);
				}
				break;
			default:
				return;
		}

		if (viewNodeId === "") {
			console.warn("NO VIEW NODE ID");
			return;
		}

		const viewNode = sceneState.sceneNodes.find((x) => x.id === viewNodeId);
		if (camera && viewNode) {
			const camParent = camera.parent as TransformNode;
			if (camParent) {
				camParent.position = viewNode.absolutePosition;
			} else {
				camera.position = viewNode.absolutePosition;
			}
		}
	}

	public async resetControls() {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const controlState =
			this.gameStateRegistry.getGameStateByStateId<ControlState>(
				STATE_ID_CONTROLSTATE,
			);

		if (controlState.actionManager) {
			controlState.actionManager.dispose();
			controlState.actionManager = null;
		}

		const actionManager = new ActionManager(sceneState.currentScene);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.switchPlayerLeft,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameplayState.playerEIDs.findIndex(
						(x) => x === gameplayState.selectedPlayerEID,
					);
					let newSelPlyEIDIndex = selPlyEidIndex - 1;
					if (newSelPlyEIDIndex < 0) {
						newSelPlyEIDIndex = gameplayState.playerEIDs.length - 1;
					}
					uiSystem.setSelectedCharacter(
						gameplayState.playerEIDs[newSelPlyEIDIndex],
					);
				},
			),
		);

		actionManager.registerAction(
			new ExecuteCodeAction(
				{
					trigger: ActionManager.OnKeyDownTrigger,
					parameter: controlState.controlSettings.switchPlayerRight,
				},
				() => {
					const uiSystem = container.resolve(UserInterfaceSystem);
					if (!uiSystem) {
						return;
					}

					let selPlyEidIndex = gameplayState.playerEIDs.findIndex(
						(x) => x === gameplayState.selectedPlayerEID,
					);
					let newSelPlyEIDIndex = selPlyEidIndex + 1;
					if (
						newSelPlyEIDIndex >
						gameplayState.playerEIDs.length - 1
					) {
						newSelPlyEIDIndex = 0;
					}
					uiSystem.setSelectedCharacter(
						gameplayState.playerEIDs[newSelPlyEIDIndex],
					);
				},
			),
		);

		controlState.actionManager = actionManager;
		sceneState.currentScene.actionManager = actionManager;
	}

	private async loadPlayerCharacter(
		charId: string,
		campaignId: string,
	): Promise<number> {
		const playerFactory = container.resolve(PlayerFactory);
		const plyerEID = await playerFactory.createEntityFromFile(
			charId,
			campaignId,
		);

		return plyerEID;
	}

	public async loadModalMap(modalRefs: string[]): Promise<void> {
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				STATE_ID_CAMPAIGNSTATE,
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				STATE_ID_USERINTERFACE,
			);

		modalRefs.forEach(async (ref) => {
			const response = await fetch(
				`${getPublicRoot()}/data/${campaignState.campaignId}/modals/${ref}.json`,
			);
			const modalData = (await response.json()) as ModalData;

			if (!modalData) {
				return;
			}

			userInterfaceState.modalMap.set(modalData.id, modalData);
		});
	}
}
