import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
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
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button } from "@babylonjs/gui";
import "@babylonjs/loaders";
import DialogueManagerSystem from "./DialogueManagerSystem";
import UserInterfaceSystem from "./UserInterfaceSystem";
import GameContext, {
	EventData,
	GameMode,
	InteractableData,
	LocationData,
	SceneData,
} from "../GameContext";
import { CreateTypography, Themes } from "../gui/Themes";
import PartyInfoHUD from "../gui/PartyInfoHUD";
import CombatHUD from "../gui/CombatHUD";
import DialogueHUD from "../gui/DialogueHUD";
import ExploreHUD from "../gui/ExploreHUD";

@singleton()
export default class SceneManagerSystem implements ISystem {
	private gameCanvas: Nullable<HTMLCanvasElement> = null;

	public async start() {
		this.gameCanvas = document.getElementById(
			"gameCanvas",
		)! as HTMLCanvasElement;
	}

	public update(deltaTime: number) {
		const context = container.resolve(GameContext);
		for (const entityId of query(context.world, [])) {
			// Component.value[entityId]    -->     how to access component data
		}
	}

	public debug(debugOn: boolean = true) {
		const context = container.resolve(GameContext);

		if (debugOn) {
			context.scene.debugLayer.show({ overlay: true });
		} else {
			context.scene.debugLayer.hide();
		}
	}

	public setGameMode(newMode: GameMode) {
		const context = container.resolve(GameContext);

		const uiSystem = container.resolve(UserInterfaceSystem);
		uiSystem.setGameMode(newMode);

		if (newMode == GameMode.MainMenu) {
			// X
		} else if (newMode == GameMode.Explore) {
			const camera = context.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.attachControl(this.gameCanvas);
			context.insceneLocationGUI.rootContainer.isVisible = true;
			context.insceneCombatGUI.rootContainer.isVisible = false;
			// X
		} else if (newMode == GameMode.Dialogue) {
			const camera = context.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			context.insceneLocationGUI.rootContainer.isVisible = false;
			context.insceneCombatGUI.rootContainer.isVisible = false;
		} else if (newMode == GameMode.Combat) {
			const camera = context.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			context.insceneLocationGUI.rootContainer.isVisible = false;
			context.insceneCombatGUI.rootContainer.isVisible = true;
		}

		const newContext = { ...context, gameMode: newMode } as GameContext;
		container.register(GameContext, { useValue: newContext });
	}

	public async createScene(
		engine: Engine,
		fileName: string,
		campaignId: string,
		gameMode: GameMode,
	) {
		const response = await fetch(`/data/${campaignId}/scenes/${fileName}.json`);
		const sceneData = await response.json();
		if (!sceneData) {
			return;
		}

		const world = createWorld();
		const scene = new Scene(engine);
		const uiScene = new Scene(engine);
		uiScene.autoClear = false;

		const expCamPos = sceneData?.locations[0].exploreViewPosition!;
		const camera = new UniversalCamera(
			"cam_explore",
			new Vector3(expCamPos[0], expCamPos[1], expCamPos[2]),
			scene,
		);
		camera.setFocalLength(30);
		camera.setTarget(new Vector3(0, 0, -40));
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
		const locationLoaded = await this.loadLocation(0, scene, sceneData);
		const combatGUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_combat",
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

		const playerEids = [0];

		const newContext = new GameContext(
			campaignId,
			playerEids[0],
			playerEids,
			gameMode,
			world,
			scene,
			uiScene,
			sceneData,
			locationLoaded.data,
			mainUI,
			locationLoaded.gui,
			combatGUI,
			partyInfoHud,
			exploreHud,
			dialogueHud,
			combatHud,
		);

		container.register(GameContext, { useValue: newContext });
	}

	public async loadLocationEvent(
		eventData: EventData,
		locationMeshes: AbstractMesh[],
	) {}

	public async loadCombatEncounter(
		encounterId: string,
		locationIndex: number,
	) {}

	public checkEventTriggers() {}

	private async loadLocation(
		locationIndex: number,
		scene: Scene,
		sceneData: SceneData,
	): Promise<{ data: LocationData; gui: AdvancedDynamicTexture }> {
		const locMeshes = await ImportMeshAsync(
			`./models/maps/${sceneData?.locations[locationIndex].modelURL}`,
			scene,
		);
		const locationData = sceneData.locations[locationIndex];

		const locationGUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_location",
			true,
			scene,
		);

		locationData.interactables.forEach(async (itr) => {
			await this.loadLocationInteractable(itr, locMeshes.meshes, locationGUI);
		});

		locationData.events.forEach(async (evt) => {
			await this.loadLocationEvent(evt, locMeshes.meshes);
		});

		return { data: locationData, gui: locationGUI };
	}

	private async loadLocationInteractable(
		interactableData: InteractableData,
		locationMeshes: AbstractMesh[],
		locationGUI: AdvancedDynamicTexture,
	) {
		const attachedMesh = locationMeshes.find(
			(x) => x.name == interactableData.attachedModelId,
		);

		if (!attachedMesh) {
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
			const context = container.resolve(GameContext);
			context.exploreHud.updateHighlightInfoUI(
				interactableData.name,
				interactableData.description,
			);
		});
		button.onPointerOutObservable.add(() => {
			const context = container.resolve(GameContext);
			context.exploreHud.hideHighlightInfoUI();
		});
		button.onPointerClickObservable.add(() => {
			// Loads and runs dialogue based on dialogueId in interactableData
			if (!attachedMesh) {
				return;
			}

			const dmSystem = container.resolve(DialogueManagerSystem);
			dmSystem.startDialogue(interactableData.dialogueNodeId, {
				data: interactableData,
				mesh: attachedMesh,
			});
		});
		locationGUI.addControl(button);
		button.linkWithMesh(attachedMesh);
	}
}
