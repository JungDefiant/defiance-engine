import "reflect-metadata";
import { container, inject } from "tsyringe";
import { Engine, Nullable, Scene } from "@babylonjs/core";
import SceneManagerSystem from "./systems/SceneManagerSystem";
import DialogueManagerSystem from "./systems/DialogueManagerSystem";
import UserInterfaceSystem from "./systems/UserInterfaceSystem";
import CombatManagerSystem from "./systems/CombatManagerSystem";
import GameContext, { GameMode } from "./GameContext";
import { PlayerFactory } from "./factories/PlayerFactory";
import { createWorld } from "bitecs";

// This is the engine/game loop
export class App {
	private engine: Engine;
	private readonly context: Nullable<GameContext> = null;

	constructor(
		@inject(SceneManagerSystem) private smSystem: SceneManagerSystem,
		@inject(UserInterfaceSystem) private uiSystem: UserInterfaceSystem,
		@inject(DialogueManagerSystem) private dmSystem: DialogueManagerSystem,
		@inject(CombatManagerSystem) private cmSystem: CombatManagerSystem,
		@inject(PlayerFactory) private actorFactory: PlayerFactory,
	) {
		const canvas = document.getElementById(
			"gameCanvas",
		)! as any as HTMLCanvasElement;
		this.engine = new Engine(canvas);
		window.addEventListener("resize", () => {
			this.engine.resize();
		});
	}

	public async run() {
		await this.startSystems();

		// TEST
		await this.smSystem.createScene(
			this.engine,
			"scene_test",
			"campaign_test",
			GameMode.Combat,
		);
		this.smSystem.setGameMode(GameMode.Combat);
		this.cmSystem.startCombat("enc_test");

		await this.startFactories();
		const context = container.resolve(GameContext);

		this.engine.runRenderLoop(() => {
			context.scene.render();
			this.uiSystem.uiScene?.render();
		});
	}

	private async startSystems() {
		await this.uiSystem.start(this.engine);
		await this.smSystem.start();
		await this.dmSystem.start();
		await this.cmSystem.start();
	}

	private async startFactories() {
		await this.actorFactory.start();
	}
}

const smSystem = container.resolve(SceneManagerSystem);
const uiSystem = container.resolve(UserInterfaceSystem);
const dmSystem = container.resolve(DialogueManagerSystem);
const cmSystem = container.resolve(CombatManagerSystem);
const actFactory = container.resolve(PlayerFactory);

const app = new App(smSystem, uiSystem, dmSystem, cmSystem, actFactory);
app.run();
