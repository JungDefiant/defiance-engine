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
	createScene(
		engine: Engine,
		fileName: string,
		campaignId: string,
		gameMode: GameMode,
	): void;
	loadLocationEvent(eventData: EventData, locationMeshes: AbstractMesh[]): void;
	loadCombatEncounter(encounterId: string, locationIndex: number): void;
	checkEventTriggers(): void;
}

@singleton()
export default class SceneManagerSystem implements ISceneManagerSystem {
	private gameCanvas: Nullable<HTMLCanvasElement> = null;

	public async start() {
		this.gameCanvas = document.getElementById(
			"gameCanvas",
		)! as HTMLCanvasElement;
	}

	public update() {
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
		const newContext = { ...context, gameMode: newMode } as GameContext;

		const uiSystem = container.resolve(UserInterfaceSystem);
		uiSystem.setGameMode(newMode);

		if (newMode == GameMode.MainMenu) {
			// X
		} else if (newMode == GameMode.Explore) {
			const camera = newContext.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.attachControl(this.gameCanvas);
			newContext.locationGUI.rootContainer.isVisible = true;
			// X
		} else if (newMode == GameMode.Dialogue || newMode == GameMode.Combat) {
			const camera = newContext.scene.activeCamera;

			if (!camera) {
				return;
			}

			camera.detachControl();
			newContext.locationGUI.rootContainer.isVisible = true;
		}

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
		skyboxMaterial.emissiveColor = new Color3(1, 1, 1);
		skyboxMaterial.backFaceCulling = true;
		skyboxMaterial.disableLighting = true;
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;

		const light = new HemisphericLight("light", new Vector3(1, 1, 1), scene);
		light.intensity = 1;

		const locationLoaded = await this.loadLocation(0, scene, sceneData);

		const combatGUI = AdvancedDynamicTexture.CreateFullscreenUI("ui_combat");

		const newContext = new GameContext(
			campaignId,
			gameMode,
			world,
			scene,
			sceneData,
			locationLoaded.data,
			locationLoaded.gui,
			combatGUI,
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

		const locationGUI =
			AdvancedDynamicTexture.CreateFullscreenUI("ui_location");

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
		locationGUI.addControl(button);
		button.linkWithMesh(attachedMesh);
	}
}
