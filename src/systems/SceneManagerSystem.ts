import { singleton } from "tsyringe";
import ISystem from "./ISystem";
import { World, createWorld, query } from "bitecs";
import { Engine, HemisphericLight, Scene, Vector3, ImportMeshAsync, AbstractMesh, MeshBuilder, StandardMaterial, Color3, UniversalCamera } from '@babylonjs/core';
import { AdvancedDynamicTexture, Button, Rectangle } from "@babylonjs/gui";
import "@babylonjs/loaders"

@singleton()
export default class SceneManagerSystem implements ISystem {
    public scene?: Scene;
    public world?: World;
    public sceneData?: Map<string, SceneData>;

    constructor() { }

    public async start() {
        // Import scene data files
        const allData = await import.meta.glob("/src/data/scenes/*.json");
        this.sceneData = new Map<string, SceneData>();
        for (const path in allData) {
            const data = await allData[path]() as SceneData;
            this.sceneData.set(data.id, data);
        }
    }

    public update(): void {
        if (!this.world && !this.scene) {
            return;
        }

        const world = this.world as World;
        for (const entityId of query(world, [])) {
            // Component.value[entityId]    -->     how to access component data
        }
    }

    public debug(debugOn: boolean = true) {
        if (!this.scene) {
            return;
        }

        if (debugOn) {
            this.scene.debugLayer.show({ overlay: true });
        } else {
            this.scene.debugLayer.hide();
        }
    }


    public async loadScene(sceneId: string, engine: Engine) {
        this.world = createWorld();
        this.scene = new Scene(engine);
        const camera = new UniversalCamera("camera1", new Vector3(0, 1.5, 0), this.scene);
        camera.setFocalLength(30);
        camera.setTarget(new Vector3(0, 0, -20));
        camera.attachControl();

        this.scene.onPointerObservable.add((eventData) => {
            // This will block out vertical rotation
            // For blocking out horizontal rotation, simply use y instead of x
            camera.cameraRotation.x = 0;
        });

        const skybox = MeshBuilder.CreateBox("skybox", { size: 100.0 }, this.scene);
        const skyboxMaterial = new StandardMaterial("skyBox", this.scene);
        skyboxMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
        skyboxMaterial.backFaceCulling = true;
        skyboxMaterial.disableLighting = true;
        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;

        const light = new HemisphericLight("light", new Vector3(1, 1, 0), this.scene);
        light.intensity = 0.7;

        const sceneData = this.sceneData?.get(sceneId);

        await this.loadLocation(0, sceneData!);
    }

    private async loadLocation(locationIndex: number, sceneData: SceneData) {
        const locMesh = await ImportMeshAsync(`./models/maps/${sceneData?.locations[locationIndex].modelURL}`, this.scene!);
        const locData = sceneData.locations[locationIndex];
        const locGUI = AdvancedDynamicTexture.CreateFullscreenUI("LocationGUI");

        locData.interactables.forEach(async (itr) => {
            await this.loadLocationInteractable(itr, locGUI, locMesh.meshes);
        });

        locData.events.forEach(async (evt) => {
            await this.loadLocationEvent(evt, locGUI, locMesh.meshes);
        })
    }

    private async loadLocationInteractable(interactableData: InteractableData, locationGUI: AdvancedDynamicTexture, locationMeshes: AbstractMesh[]) {
        const button = Button.CreateSimpleButton(interactableData.id, "?");
        button.width = 0.1;
        button.height = 0.1;
        button.color = "Blue";
        button.background = "Blue";
        button.textBlock!.color = "Black";
        button.thickness = 2;
        // button.onPointerClickObservable()    --> loads and runs dialogue based on dialogueId in interactableData
        locationGUI.addControl(button);

        const attachedMesh = locationMeshes.find(x => x.name == interactableData.attachedModelId);
        console.log(attachedMesh);
        console.log(locationMeshes);

        button.linkWithMesh(attachedMesh!);
    }

    private triggerInteractableDialogue(dialogueNodeId: string) {

    }

    public async loadLocationEvent(eventData: EventData, locationGUI: AdvancedDynamicTexture, locationMeshes: AbstractMesh[]) {

    }

    public async loadCombatEncounter(encounterId: string, locationIndex: number) {

    }

    public checkEventTriggers() {

    }
}

export interface SceneData {
    id: string,
    difficultyLevel: number,
    startLocationId: string,
    locations: LocationData[]
}

interface LocationData {
    id: string,
    modelURL: string,
    interactables: InteractableData[],
    events: EventData[]
}

interface InteractableData {
    id: string,
    dialogueNodeId: string,
    attachedModelId: string
}

interface EventData {
    id: string,
    flagTriggers: string[]
}