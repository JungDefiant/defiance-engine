import { Color3, Engine, FreeCamera, HemisphericLight, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from 'babylonjs';
import { addPrefab, createWorld, World } from 'bitecs';

// This is the engine and the scene manager
export class App {
    private engine: Engine;
    private scene: Scene;
    private world: World;

    constructor() {
        const canvas = document.getElementById("gameCanvas")! as any as HTMLCanvasElement;
        this.engine = new Engine(canvas);
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        const { scene, world } = this.createScene(this.engine);
        this.scene = scene;
        this.world = world;
    }

    public debug(debugOn: boolean = true) {
        if (debugOn) {
            this.scene.debugLayer.show({ overlay: true });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    public run() {
        this.debug(false);
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    public createScene(engine: Engine): { scene: Scene, world: World } {
        const world = createWorld();
        const scene = new Scene(engine);

        const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
        camera.setTarget(Vector3.Zero());

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        const ground = MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
        const groundMaterial = new StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.5, 0.8, 0.5);
        ground.material = groundMaterial;
        groundMaterial.bumpTexture = new Texture("./normal.jpg", scene);

        scene.registerBeforeRender(() => {
        });

        return { scene, world };
    };
}

const app = new App();
app.run();
