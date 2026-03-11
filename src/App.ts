import "reflect-metadata";
import { container } from "tsyringe";
import { Engine } from "@babylonjs/core";
import SceneManagerSystem from "./systems/SceneManagerSystem";
import DialogueManagerSystem from "./systems/DialogueManagerSystem";
import UserInterfaceSystem, { GameMode } from "./systems/UserInterfaceSystem";

// This is the engine and the scene manager
export class App {
	private engine: Engine;

	constructor() {
		const canvas = document.getElementById(
			"gameCanvas",
		)! as any as HTMLCanvasElement;
		this.engine = new Engine(canvas);
		window.addEventListener("resize", () => {
			this.engine.resize();
		});

		// Create systems
		container.registerSingleton(SceneManagerSystem);
		container.registerSingleton(UserInterfaceSystem);
		container.registerSingleton(DialogueManagerSystem);
	}

	public async run() {
		await this.startSystems();
		const smSystem = container.resolve(SceneManagerSystem);
		const uiSystem = container.resolve(UserInterfaceSystem);

		this.engine.runRenderLoop(() => {
			smSystem.activeScene?.render();
			uiSystem.uiScene?.render();
		});
	}

	private async startSystems() {
		const smSystem = container.resolve(SceneManagerSystem);
		await smSystem.start();
		await smSystem.loadScene("test", this.engine);
		smSystem.setGameMode(GameMode.Explore);

		const uiSystem = container.resolve(UserInterfaceSystem);
		await uiSystem.start(this.engine);

		const dmSystem = container.resolve(DialogueManagerSystem);
		await dmSystem.start();
	}
}

const app = new App();
app.run();
