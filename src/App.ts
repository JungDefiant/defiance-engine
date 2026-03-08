import "reflect-metadata";
import { Color3, Engine, FreeCamera, HemisphericLight, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from '@babylonjs/core';
import { addPrefab, createWorld, World } from 'bitecs';
import SceneManagerSystem from './systems/SceneManagerSystem';
import { container, Lifecycle } from 'tsyringe';

// This is the engine and the scene manager
export class App {
    private engine: Engine;

    constructor() {
        const canvas = document.getElementById("gameCanvas")! as any as HTMLCanvasElement;
        this.engine = new Engine(canvas);
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Create systems
        container.registerSingleton(SceneManagerSystem);
    }

    public async run() {
        const smSystem = container.resolve(SceneManagerSystem);
        await smSystem.start();
        const scene = await smSystem.loadScene("test", this.engine);
        this.engine.runRenderLoop(() => {
            smSystem.scene?.render();
        });
    }
}

const app = new App();
app.run();
