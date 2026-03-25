import "reflect-metadata";
import { container } from "tsyringe";
import { Engine } from "@babylonjs/core";
import SceneManagerSystem, {
	GameMode,
	ISceneManagerSystem,
} from "./systems/SceneManagerSystem";
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
	}

	public async run() {
		// Create systems
		container.registerSingleton<ISceneManagerSystem>(
			"SceneManagerSystem",
			SceneManagerSystem,
		);
		container.registerSingleton("UserInterfaceSystem", UserInterfaceSystem);
		container.registerSingleton("DialogueManagerSystem", DialogueManagerSystem);
		container.registerSingleton<ICombatManagerSystem>(
			"CombatManagerSystem",
			CombatManagerSystem,
		);
		container.registerSingleton<IPartyStateSystem>(
			"PartyStateSystem",
			PartyStateSystem,
		);

		await this.startSystems();
		const smSystem = container.resolve(SceneManagerSystem);
		const uiSystem = container.resolve(UserInterfaceSystem);

		this.engine.runRenderLoop(() => {
			smSystem.getActiveScene()?.render();
			uiSystem.uiScene?.render();
		});
	}

	private async startSystems() {
		const uiSystem = container.resolve(UserInterfaceSystem);
		await uiSystem.start(this.engine);

		const smSystem = container.resolve(SceneManagerSystem);
		await smSystem.start();

		const dmSystem = container.resolve(DialogueManagerSystem);
		await dmSystem.start();

		const cmSystem = container.resolve(CombatManagerSystem);
		await cmSystem.start();

		// TEST
		await smSystem.loadScene("test", this.engine);
		smSystem.setGameMode(GameMode.Combat);
		cmSystem.startCombat("enc_test");
	}
}

const app = new App();
app.run();
