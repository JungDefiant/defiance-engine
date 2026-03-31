import { container, Lifecycle, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { World, createWorld, query } from "bitecs";
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

export interface ISceneManagerSystem extends ISystem {
	debug(debugOn: boolean): void;
	setGameMode(GameMode: GameMode): void;
	createScene(engine: Engine, fileName: string, campaignId: string): void;
	loadLocationEvent(eventData: EventData, locationMeshes: AbstractMesh[]): void;
	loadCombatEncounter(encounterId: string, locationIndex: number): void;
	checkEventTriggers(): void;
}

@singleton()
export default class SceneManagerSystem implements ISceneManagerSystem {
	private activeScene: Nullable<Scene> = null;
	private campaignId: string = "campaign_test";
	private activeSceneId: string = "";
	private activeWorld: Nullable<World> = null;
	private activeGameMode: GameMode = GameMode.MainMenu;
	private activeLocationData: Nullable<LocationData> = null;
	private locationGUI: Nullable<AdvancedDynamicTexture> = null;
	private gameCanvas: Nullable<HTMLCanvasElement> = null;
	private sceneData: Map<string, SceneData> = new Map<string, SceneData>();

	public async start() {
		// Import scene data files
		const allData = await import.meta.glob("/src/data/*/scenes/*.json");
		for (const path in allData) {
			const campaignId = path.split("/")[3];
			if (campaignId == this.campaignId) {
				const data = (await allData[path]()) as SceneData;
				this.sceneData.set(data.id, data);
			}
		}

		this.gameCanvas = document.getElementById(
			"gameCanvas",
		)! as HTMLCanvasElement;
	}

	public update() {
		for (const entityId of query(this.activeWorld!, [])) {
			// Component.value[entityId]    -->     how to access component data
		}
	}

	public debug(debugOn: boolean = true) {
		if (!this.activeScene) {
			return;
		}

		if (debugOn) {
			this.activeScene.debugLayer.show({ overlay: true });
		} else {
			this.activeScene.debugLayer.hide();
		}
	}

	public setGameMode(newMode: GameMode) {
		this.activeGameMode = newMode;

		const uiSystem = container.resolve(UserInterfaceSystem);
		uiSystem.setGameMode(this.activeGameMode);

		if (newMode == GameMode.MainMenu) {
			// X
		} else if (newMode == GameMode.Explore) {
			const camera = this.activeScene?.activeCamera;

			if (!camera || !this.locationGUI) {
				return;
			}

			camera.attachControl(this.gameCanvas);
			this.locationGUI.rootContainer.isVisible = true;
			// X
		} else if (newMode == GameMode.Dialogue || newMode == GameMode.Combat) {
			const camera = this.activeScene?.activeCamera;

			if (!camera || !this.locationGUI) {
				return;
			}

			camera.detachControl();
			this.locationGUI.rootContainer.isVisible = true;
		}
	}

	public async createScene(
		engine: Engine,
		fileName: string,
		campaignId: string,
	) {
		const response = await fetch(`/data/${campaignId}/scenes/${fileName}.json`);
		const sceneData = await response.json();
		if (!sceneData) {
			return;
		}

		const sceneId = fileName;
		const world = createWorld();
		const scene = new Scene(engine);

		// Test
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

		const skybox = MeshBuilder.CreateBox(
			"skybox",
			{ size: 100.0 },
			this.activeScene,
		);
		const skyboxMaterial = new StandardMaterial("skyBox", scene);
		skyboxMaterial.emissiveColor = new Color3(1, 1, 1);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;

		const light = new HemisphericLight("light", new Vector3(1, 1, 1), scene);
		light.intensity = 1;

		const locationLoaded = await this.loadLocation(0, scene, sceneData);

		const context = new GameContext(
			campaignId,
			world,
			scene,
			sceneData,
			locationLoaded.data,
			locationLoaded.gui,
		);

		container.register(GameContext, { useValue: context });
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

		const locationGUI =
			AdvancedDynamicTexture.CreateFullscreenUI("ui_location");

		locationData.interactables.forEach(async (itr) => {
			await this.loadLocationInteractable(itr, locMeshes.meshes);
		});

		locationData.events.forEach(async (evt) => {
			await this.loadLocationEvent(evt, locMeshes.meshes);
		});

		return { data: locationData, gui: locationGUI };
	}

	private async loadLocationInteractable(
		interactableData: InteractableData,
		locationMeshes: AbstractMesh[],
	) {
		const attachedMesh = locationMeshes.find(
			(x) => x.name == interactableData.attachedModelId,
		);

		if (!this.locationGUI || !attachedMesh) {
			return;
		}

		const button = Button.CreateSimpleButton(interactableData.id, "?");
		button.width = 0.1;
		button.height = 0.1;
		button.color = "Blue";
		button.background = "Blue";
		button.textBlock!.color = "Black";
		button.thickness = 2;
		button.onPointerEnterObservable.add(() => {
			const uiSystem = container.resolve(UserInterfaceSystem);
			uiSystem
				.getExploreHud()
				.updateHighlightInfoUI(
					interactableData.name,
					interactableData.description,
				);
		});
		button.onPointerOutObservable.add(() => {
			const uiSystem = container.resolve(UserInterfaceSystem);
			uiSystem.getExploreHud().hideHighlightInfoUI();
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
		this.locationGUI.addControl(button);
		button.linkWithMesh(attachedMesh);
	}
}
