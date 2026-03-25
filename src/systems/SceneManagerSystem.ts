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
import { EnemyData } from "./CombatManagerSystem";

export interface ISceneManagerSystem extends ISystem {
	getCampaignId(): string;
	getActiveScene(): Scene;
	getActiveSceneData(): SceneData;
	getActiveLocationData(): Nullable<LocationData>;
	getActiveLocationUI(): Nullable<AdvancedDynamicTexture>;
	debug(debugOn: boolean): void;
	setGameMode(GameMode: GameMode): void;
	loadScene(sceneId: string, engine: Engine): void;
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

	public getCampaignId(): string {
		return this.campaignId;
	}

	public getActiveScene(): Scene {
		return this.activeScene as Scene;
	}

	public getActiveSceneData(): SceneData {
		return this.sceneData.get(this.activeSceneId) as SceneData;
	}

	public getActiveLocationData(): Nullable<LocationData> {
		return this.activeLocationData;
	}

	public getActiveLocationUI(): Nullable<AdvancedDynamicTexture> {
		return this.locationGUI;
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
			camera?.attachControl(this.gameCanvas);
			this.locationGUI!.rootContainer.isVisible = true;
			// X
		} else if (newMode == GameMode.Dialogue || newMode == GameMode.Combat) {
			const camera = this.activeScene?.activeCamera;
			camera?.detachControl();
			this.locationGUI!.rootContainer.isVisible = false;
		}
	}

	public async loadScene(sceneId: string, engine: Engine) {
		const sceneData = this.sceneData?.get(sceneId);
		this.activeSceneId = sceneId;
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
		skyboxMaterial.emissiveColor = new Color3(1, 1, 1);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;

		const light = new HemisphericLight(
			"light",
			new Vector3(1, 1, 1),
			this.activeScene,
		);
		light.intensity = 1;

		await this.loadLocation(0, sceneData!);
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

	private async loadLocation(locationIndex: number, sceneData: SceneData) {
		const locMeshes = await ImportMeshAsync(
			`./models/maps/${sceneData?.locations[locationIndex].modelURL}`,
			this.activeScene!,
		);
		this.activeLocationData = sceneData.locations[locationIndex];

		this.locationGUI = AdvancedDynamicTexture.CreateFullscreenUI("ui_location");

		this.activeLocationData.interactables.forEach(async (itr) => {
			if (!this.activeLocationData) {
				return;
			}

			await this.loadLocationInteractable(itr, locMeshes.meshes);
		});

		this.activeLocationData.events.forEach(async (evt) => {
			await this.loadLocationEvent(evt, locMeshes.meshes);
		});
	}

	private async loadLocationInteractable(
		interactableData: InteractableData,
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
}

interface SceneData {
	id: string;
	difficultyLevel: number;
	startLocationId: string;
	locations: LocationData[];
	encounters: EncounterData;
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

export interface EncounterData {
	[index: string]: EnemyData[];
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
