import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, Vector3, HemisphericLight, Mesh, MeshBuilder, FollowCamera, Camera, Viewport, Quaternion, PBRMaterial, Color3, StandardMaterial } from "@babylonjs/core";
import { InputController } from "./controllers/inputController";
import { PlayerController } from "./controllers/playerController";

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        const canvas = document.createElement("canvas");
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        const engine = new Engine(canvas, true);
        const scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(1, 1, 0), scene);
        light.intensity = 0.7;

        const playerMesh: Mesh = MeshBuilder.CreateCylinder("player", { height: 2, diameter: .5 }, scene);
        playerMesh.rotation = new Vector3(0, 0, 0);
        playerMesh.position = new Vector3(0, 1, 0);
        const playerMeshMat = new StandardMaterial("player_mat", scene);
        playerMesh.material = playerMeshMat;
        playerMeshMat.emissiveColor = new Color3(0, 0.75, 0);
        playerMeshMat.disableLighting = true;

        const newInput: InputController = new InputController(scene);
        const newPlayer: PlayerController = new PlayerController({ mesh: playerMesh }, scene, newInput);

        const ground: Mesh = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
        ground.position = new Vector3(0, 0, 0);
        const groundMat = new StandardMaterial("ground_mat", scene);
        ground.material = groundMat;
        groundMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
        groundMat.disableLighting = true;

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.key === "G") {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }
}

new App();
