import { container, singleton } from "tsyringe";
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

@singleton()
export default class SceneManagerSystem implements ISystem {
	public activeScene: Nullable<Scene> = null;
	public activeWorld: Nullable<World> = null;
	public activeGameMode: GameMode = GameMode.MainMenu;
	public locationGUI: Nullable<AdvancedDynamicTexture> = null;

	private gameCanvas: Nullable<HTMLCanvasElement> = null;
	private currentLocationData: Nullable<LocationData> = null;
	private sceneData: Map<string, SceneData> = new Map<string, SceneData>();

	public async start() {
		// Import scene data files
		const allData = await import.meta.glob("/src/data/scenes/*.json");
		for (const path in allData) {
			const data = (await allData[path]()) as SceneData;
			this.sceneData.set(data.id, data);
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

	public async loadScene(sceneId: string, engine: Engine) {
		const sceneData = this.sceneData?.get(sceneId);
		this.activeWorld = createWorld();
		this.activeScene = new Scene(engine);

		// Test
		const expCamPos = sceneData?.locations[0].exploreViewPosition!;
		const camera = new UniversalCamera(
			"cam_explore",
			new Vector3(expCamPos[0], expCamPos[1], expCamPos[2]),
			this.activeScene,
		);
		camera.setFocalLength(30);
		camera.setTarget(new Vector3(0, 0, -40));
		camera.viewport = new Viewport(0, 0.1, 1, 1);
		camera.attachControl(this.gameCanvas, false);

		this.activeScene.onPointerObservable.add((eventData) => {
			// This will block out vertical rotation
			// For blocking out horizontal rotation, simply use y instead of x
			camera.cameraRotation.x = 0;
		});

		const skybox = MeshBuilder.CreateBox(
			"skybox",
			{ size: 100.0 },
			this.activeScene,
		);
		const skyboxMaterial = new StandardMaterial("skyBox", this.activeScene);
		skyboxMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;

		const light = new HemisphericLight(
			"light",
			new Vector3(1, 1, 0),
			this.activeScene,
		);
		light.intensity = 0.7;

		await this.loadLocation(0, sceneData!);
	}

	private async loadLocation(locationIndex: number, sceneData: SceneData) {
		const locMeshes = await ImportMeshAsync(
			`./models/maps/${sceneData?.locations[locationIndex].modelURL}`,
			this.activeScene!,
		);
		this.currentLocationData = sceneData.locations[locationIndex];

		this.locationGUI = AdvancedDynamicTexture.CreateFullscreenUI("ui_location");

		this.currentLocationData.interactables.forEach(async (itr) => {
			if (!this.currentLocationData) {
				return;
			}

			await this.loadLocationInteractable(
				itr,
				this.currentLocationData,
				locMeshes.meshes,
			);
		});

		this.currentLocationData.events.forEach(async (evt) => {
			await this.loadLocationEvent(evt, locMeshes.meshes);
		});
	}

	private async loadLocationInteractable(
		interactableData: InteractableData,
		locationData: LocationData,
		locationMeshes: AbstractMesh[],
	) {
		const attachedMesh = locationMeshes.find(
			(x) => x.name == interactableData.attachedModelId,
		);

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
		this.locationGUI!.addControl(button);
		button.linkWithMesh(attachedMesh!);
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

	public setGameMode(newMode: GameMode) {
		this.activeGameMode = newMode;

		const uiSystem = container.resolve(UserInterfaceSystem);
		uiSystem.setGameMode(this.activeGameMode);

		if (newMode == GameMode.MainMenu) {
			// X
		} else if (newMode == GameMode.Explore) {
			const camera = this.activeScene?.activeCamera;
			camera?.attachControl(this.gameCanvas);
			this.locationGUI!.rootContainer.isVisible = true;
			// X
		} else if (newMode == GameMode.Dialogue || newMode == GameMode.Combat) {
			const camera = this.activeScene?.activeCamera;
			camera?.detachControl();
			this.locationGUI!.rootContainer.isVisible = false;
		}
	}

	public getCurrentLocationData(): Nullable<LocationData> {
		return this.currentLocationData;
	}
}

interface SceneData {
	id: string;
	difficultyLevel: number;
	startLocationId: string;
	locations: LocationData[];
}

export interface LocationData {
	id: string;
	modelURL: string;
	exploreViewPosition: number[];
	combatViewPosition: number[];
	interactables: InteractableData[];
	events: EventData[];
}

export interface InteractableData {
	id: string;
	name: string;
	description: string;
	dialogueNodeId: string;
	attachedModelId: string;
	viewPosition: number[];
	guiPositionOffset: number[];
}

interface EventData {
	id: string;
	flagTriggers: string[];
}

export enum GameMode {
	MainMenu,
	Combat,
	Explore,
	Dialogue,
}
