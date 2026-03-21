import "reflect-metadata";
import { container } from "tsyringe";
import { Engine } from "@babylonjs/core";
import SceneManagerSystem, { GameMode } from "./systems/SceneManagerSystem";
import DialogueManagerSystem from "./systems/DialogueManagerSystem";
import UserInterfaceSystem from "./systems/UserInterfaceSystem";
import CombatManagerSystem, {
	ICombatManagerSystem,
} from "./systems/CombatManagerSystem";
import PartyStateSystem, {
	IPartyStateSystem,
} from "./systems/PartyStateSystem";

// This is the engine/game loop
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
		container.registerSingleton<ICombatManagerSystem>(CombatManagerSystem);
		container.registerSingleton<IPartyStateSystem>(PartyStateSystem);
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
		const uiSystem = container.resolve(UserInterfaceSystem);
		await uiSystem.start(this.engine);

		const smSystem = container.resolve(SceneManagerSystem);
		await smSystem.start();
		await smSystem.loadScene("test", this.engine);
		smSystem.setGameMode(GameMode.Combat);

		const dmSystem = container.resolve(DialogueManagerSystem);
		await dmSystem.start();
	}
}

const app = new App();
app.run();
