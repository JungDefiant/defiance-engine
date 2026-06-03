import { container, singleton } from "tsyringe";
import ISystem from "src/systems/ISystem";
import { createWorld, EntityId, query } from "bitecs";
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
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button } from "@babylonjs/gui";
import "@babylonjs/loaders";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import GameState, {
	DoorData,
	EventData,
	GameMode,
	InteractableData,
	LocationData,
	SceneData,
} from "src/GameState";
import { CreateTypography, Themes } from "src/gui/Themes";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import CombatHUD from "src/gui/CombatHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import { DEFAULT_CAM_FOCALLENGTH, DEFAULT_CAM_TARGET } from "src/Constants";

@singleton()
export default class SceneManagerSystem implements ISystem {
	private gameCanvas: Nullable<HTMLCanvasElement> = null;

	public async start() {
		this.gameCanvas = document.getElementById(
			"gameCanvas",
		)! as HTMLCanvasElement;
	}

	public update(deltaTime: number) {}

	public debug(debugOn: boolean = true) {
		const gameState = container.resolve(GameState);

		if (debugOn) {
			gameState.scene.debugLayer.show({ overlay: true });
		} else {
			gameState.scene.debugLayer.hide();
		}
	}

	public setGameMode(newMode: GameMode) {
		const gameState = container.resolve(GameState);

		const uiSystem = container.resolve(UserInterfaceSystem);
		uiSystem.setGameMode(newMode);
		gameState.gameMode = newMode;

		if (newMode == GameMode.MainMenu) {
			// X
		} else if (newMode == GameMode.Explore) {
			const camera = gameState.scene.activeCamera as UniversalCamera;

			if (!camera) {
				return;
			}

			camera.attachControl(this.gameCanvas);
			gameState.scene.onPointerObservable.add(() => {
				// This will block out vertical rotation
				// For blocking out horizontal rotation, simply use y instead of x
				camera.cameraRotation.x = 0;
			});
			gameState.sceneGUI.rootContainer.isVisible = true;
			this.resetViewPosition(gameState);
		} else if (newMode == GameMode.Dialogue) {
			const camera = gameState.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			gameState.sceneGUI.rootContainer.isVisible = false;
		} else if (newMode == GameMode.Combat) {
			const camera = gameState.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			gameState.sceneGUI.rootContainer.isVisible = true;
			this.resetViewPosition(gameState);
		}
	}

	public async createScene(
		engine: Engine,
		fileName: string,
		campaignId: string,
		gameMode: GameMode,
	) {
		const response = await fetch(`/data/${campaignId}/scenes/${fileName}.json`);
		const sceneData = (await response.json()) as SceneData;
		if (!sceneData) {
			return;
		}

		const world = createWorld();
		const scene = new Scene(engine);
		const uiScene = new Scene(engine);
		uiScene.autoClear = false;

		const sceneNodes = (
			await ImportMeshAsync(`./models/maps/${sceneData.modelURL}`, scene)
		).transformNodes;
		console.log("SCENE NODES", sceneNodes);

		const camera = new UniversalCamera("cam_explore", Vector3.Zero(), scene);
		camera.setFocalLength(DEFAULT_CAM_FOCALLENGTH);
		camera.setTarget(DEFAULT_CAM_TARGET);
		camera.minZ = 0;
		camera.viewport = new Viewport(0, 0.1, 1, 1);
		camera.attachControl(this.gameCanvas, false);
		scene.onPointerObservable.add((eventData) => {
			// This will block out vertical rotation
			// For blocking out horizontal rotation, simply use y instead of x
			camera.cameraRotation.x = 0;
		});

		const skybox = MeshBuilder.CreateBox("skybox", { size: 100.0 }, scene);
		const skyboxMaterial = new StandardMaterial("skyBox", scene);
		skyboxMaterial.emissiveColor = Color3.FromHexString(Themes.primary3);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;

		const light = new HemisphericLight("light", new Vector3(1, 1, 1), scene);
		light.intensity = 1;

		const mainUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			uiScene,
			Texture.NEAREST_SAMPLINGMODE,
		);
		const sceneGUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_scene",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);

		const uiCamera = new UniversalCamera("cam_gui", Vector3.Zero(), uiScene);

		CreateTypography(mainUI);

		const partyInfoHud = new PartyInfoHUD();
		mainUI.addControl(partyInfoHud.createHudRoot());

		const exploreHud = new ExploreHUD();
		mainUI.addControl(exploreHud.createHudRoot());
		exploreHud.showHideHud(false);

		const dialogueHud = new DialogueHUD();
		mainUI.addControl(dialogueHud.createHudRoot());
		dialogueHud.showHideHud(false);

		const combatHud = new CombatHUD();
		mainUI.addControl(combatHud.createHudRoot());
		combatHud.showHideHud(false);

		// TO DO: load player party
		const playerEids = [0];

		const newGameState = new GameState(
			campaignId,
			playerEids[0],
			playerEids,
			gameMode,
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
		);

		container.register(GameState, { useValue: newGameState });

		const locationData = await this.loadLocation(
			sceneData.startLocationId,
			scene,
			sceneData,
			sceneNodes,
			sceneGUI,
		);

		newGameState.locationData = locationData;

		const dmSystem = container.resolve(DialogueManagerSystem);
		dmSystem.loadDialogueMap(sceneData.dialogueFile);
	}

	public checkEventTriggers() {}

	public resetViewPosition(gameState?: GameState) {
		if (!gameState) {
			gameState = container.resolve(GameState);
		}

		if (!gameState.locationData) {
			console.warn("NO LOCATION DATA");
			return;
		}

		const camera = gameState.scene.activeCamera as UniversalCamera;
		let viewNodeId = "";
		switch (gameState.gameMode) {
			case GameMode.Explore:
				viewNodeId = gameState.locationData.exploreViewNodeId;
				break;
			case GameMode.Combat:
				viewNodeId = gameState.locationData.combatViewNodeId;
				break;
			default:
				return;
		}

		if (viewNodeId === "") {
			console.warn("NO VIEW NODE ID");
			return;
		}

		const viewNode = gameState.sceneNodes.find((x) => x.id === viewNodeId);
		if (camera && viewNode) {
			camera.position = viewNode.position;
			camera.setTarget(DEFAULT_CAM_TARGET);
		}
	}

	private async clearSceneGUI() {
		const gameState = container.resolve(GameState);
		gameState.sceneGUI.getChildren().forEach((control) => {
			control.dispose();
		});
	}

	private async loadLocation(
		locationId: string,
		scene: Scene,
		sceneData: SceneData,
		sceneNodes: TransformNode[],
		sceneGUI: AdvancedDynamicTexture,
	): Promise<Nullable<LocationData>> {
		await this.clearSceneGUI();

		const locationData = sceneData.locations.find(
			(loc) => loc.id === locationId,
		);

		if (!locationData || !scene || !sceneData || !sceneNodes) {
			return null;
		}

		locationData.interactables.forEach(async (itr) => {
			await this.loadLocationInteractable(itr, sceneNodes, sceneGUI);
		});

		locationData.events.forEach(async (evt) => {
			await this.loadLocationEvent(evt, sceneNodes);
		});

		locationData.doors.forEach(async (door) => {
			await this.loadLocationDoor(door, sceneNodes, sceneGUI);
		});

		return locationData;
	}

	private async loadLocationInteractable(
		interactableData: InteractableData,
		sceneNodes: TransformNode[],
		sceneGUI: AdvancedDynamicTexture,
	) {
		const interactableNode = sceneNodes.find(
			(x) => x.id == interactableData.interactableNodeId,
		);

		if (!interactableNode) {
			return;
		}

		const button = Button.CreateSimpleButton(interactableData.id, "?");
		button.width = 0.1;
		button.height = 0.1;
		button.color = "Blue";
		button.background = "Blue";
		if (button.textBlock) {
			button.textBlock.color = "Black";
		}
		button.thickness = 2;
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

			const dmSystem = container.resolve(DialogueManagerSystem);
			dmSystem.startDialogue(interactableData.dialogueNodeId, {
				data: interactableData,
				itrNode: interactableNode,
				viewNode: viewNode,
			});
		});
		sceneGUI.addControl(button);
		button.linkWithMesh(interactableNode);
	}

	private async loadLocationEvent(
		eventData: EventData,
		sceneNodes: TransformNode[],
	) {}

	private async loadLocationDoor(
		doorData: DoorData,
		sceneNodes: TransformNode[],
		sceneGUI: AdvancedDynamicTexture,
	) {
		const attachedMesh = sceneNodes.find((x) => x.id == doorData.id);

		if (!attachedMesh) {
			return;
		}

		const button = Button.CreateSimpleButton(doorData.id, "?");
		button.width = 0.1;
		button.height = 0.1;
		button.color = "Blue";
		button.background = "Blue";
		if (button.textBlock) {
			button.textBlock.color = "Black";
		}
		button.thickness = 2;
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
			// Loads and runs dialogue based on dialogueId in interactableData
			const gameState = container.resolve(GameState);
			const smSystem = container.resolve(SceneManagerSystem);
			const newLoc = await smSystem.loadLocation(
				doorData.destination,
				gameState.scene,
				gameState.sceneData,
				gameState.sceneNodes,
				gameState.sceneGUI,
			);

			if (!newLoc) {
				return;
			}

			gameState.locationData = newLoc;
			smSystem.resetViewPosition(gameState);
		});
		sceneGUI.addControl(button);
		button.linkWithMesh(attachedMesh);
	}

	private async loadCombatEncounter(
		encounterId: string,
		locationIndex: number,
	) {}
}
