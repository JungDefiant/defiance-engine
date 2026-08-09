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
	InteractableData,
	LocationData,
	ModalData,
	SceneData,
} from "src/types/GameTypes";
import { getPublicRoot } from "src/helpers/Utils";
import { VictoryScreen } from "src/gui/screens/VictoryScreen";
import { ModalScreen } from "src/gui/screens/ModalScreen";
import { playMusic } from "src/helpers/AudioHelpers";
import { loadLocation } from "src/helpers/LocationHelpers";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import GameplayState, {
	STATE_ID_GAMEPLAYSTATE,
} from "src/states/GameplayState";
import SceneState, { STATE_ID_SCENESTATE } from "src/states/SceneState";
import UserInterfaceState, {
	STATE_ID_USERINTERFACE,
} from "src/states/UserInterfaceState";
import ControlState, { STATE_ID_CONTROLSTATE } from "src/states/ControlState";
import CampaignState, {
	STATE_ID_CAMPAIGNSTATE,
} from "src/states/CampaignState";

export interface NewLocationSceneParams {
	scene: Scene;
	sceneData: SceneData;
	sceneNodes: TransformNode[];
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
				STATE_ID_SCENESTATE,
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
				STATE_ID_CAMPAIGNSTATE,
			);
		const gameplayState =
			this.gameStateRegistry.getGameStateByStateId<GameplayState>(
				STATE_ID_GAMEPLAYSTATE,
			);
		const userInterfaceState =
			this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
				STATE_ID_USERINTERFACE,
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

	public async createNewScene(sceneId: string, engine: Engine) {
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				STATE_ID_CAMPAIGNSTATE,
			);
		const response = await fetch(
			`${getPublicRoot()}/data/${campaignState.campaignId}/scenes/${sceneId}.json`,
		);
		const sceneData = (await response.json()) as SceneData;
		if (!sceneData) {
			return;
		}

		const world = createWorld();
		const scene = new Scene(engine);
		const uiScene = new Scene(engine);
		uiScene.autoClear = false;

		const sceneNodes = (
			await ImportMeshAsync(
				`${getPublicRoot()}/models/maps/${sceneData.modelURL}`,
				scene,
			)
		).transformNodes;

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
		const cameraEid = addEntity(world);
		addComponent(world, cameraEid, camera);

		const skybox = MeshBuilder.CreateBox("skybox", { size: 100.0 }, scene);
		const skyboxMaterial = new StandardMaterial("skyBox", scene);
		skyboxMaterial.emissiveColor = Color3.FromHexString(Themes.primary3);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;

		const light = new HemisphericLight(
			"light",
			new Vector3(1, 1, 1),
			scene,
		);
		light.intensity = 1;

		const mainUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			uiScene,
			Texture.NEAREST_SAMPLINGMODE,
		);
		mainUI.idealWidth = 800;
		mainUI.idealHeight = 600;

		const sceneGUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_scene",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);
		sceneGUI.idealWidth = 800;
		sceneGUI.idealHeight = 600;

		const uiCamera = new UniversalCamera(
			"cam_gui",
			Vector3.Zero(),
			uiScene,
		);

		// Initialize UI and HUDs
		CreateTypography(mainUI);

		document.fonts.ready.then(() => {
			mainUI.markAsDirty();
		});

		document.fonts.ready.then(() => {
			sceneGUI.markAsDirty();
		});

		// NOTE: Order of the HUDs matter!
		const exploreHud = new ExploreHUD();
		mainUI.addControl(exploreHud.createHudRoot());
		exploreHud.showHideHud(false);

		const combatHud = new CombatHUD();
		mainUI.addControl(combatHud.createHudRoot());
		combatHud.showHideHud(false);

		const tacticalPauseScreen = new TacticalPauseScreen();
		mainUI.addControl(tacticalPauseScreen.getRoot());
		tacticalPauseScreen.showHide(false);

		const partyInfoHud = new PartyInfoHUD();
		mainUI.addControl(partyInfoHud.createHudRoot());

		const dialogueHud = new DialogueHUD();
		mainUI.addControl(dialogueHud.createHudRoot());
		dialogueHud.showHideHud(false);

		const modalScreen = new ModalScreen();
		mainUI.addControl(modalScreen.getRoot());

		const gameOverScreen = new GameOverScreen();
		mainUI.addControl(gameOverScreen.getRoot());
		gameOverScreen.showHide(false);

		const victoryScreen = new VictoryScreen();
		mainUI.addControl(victoryScreen.getRoot());
		victoryScreen.showHide(false);

		const newGameState = new GameState(
			campaignId,
			GameMode.Explore,
			-1,
			cameraEid,
			[],
			world,
			scene,
			uiScene,
			sceneData,
			sceneNodes,
			mainUI,
			sceneGUI,
			partyInfoHud,
			exploreHud,
			dialogueHud,
			combatHud,
			tacticalPauseScreen,
			modalScreen,
			gameOverScreen,
			victoryScreen,
		);
		container.register(GameState, { useValue: newGameState });

		newGameState.lastExploreViewTarget = DEFAULT_CAM_TARGET;

		this.loadPlayerParty(characterIds);

		const newLocationSceneParams = {
			scene,
			sceneData,
			sceneGUI,
			sceneNodes,
			exploreGUIControls: newGameState.exploreGUIControls,
		} as NewLocationSceneParams;
		const locationData = await loadLocation(
			sceneData.startLocationId,
			newLocationSceneParams,
		);
		newGameState.currentLocation = locationData;

		const dmSystem = container.resolve(DialogueManagerSystem);
		await dmSystem.initSemantics();
		await dmSystem.loadDialogueMap(sceneData.dialogueFile);

		await this.loadModalMap(sceneData.modalRefs);

		await playMusic(sceneData.startMusic, newGameState);

		this.setGameMode(GameMode.Explore);
	}

	public async runScene(engine: Engine, app: App) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);
		engine.runRenderLoop(() => {
			sceneState.currentScene.render();
			const deltaTime = sceneState.currentScene.deltaTime / DELTATIME_MS;
			app.updateSystems(deltaTime);
		});
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
