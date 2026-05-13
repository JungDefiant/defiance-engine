import "reflect-metadata";
import { container, inject } from "tsyringe";
import { Engine } from "@babylonjs/core";
import SceneManagerSystem from "./systems/SceneManagerSystem";
import DialogueManagerSystem from "./systems/DialogueManagerSystem";
import UserInterfaceSystem from "./systems/UserInterfaceSystem";
import CombatManagerSystem from "./systems/CombatManagerSystem";
import ActorStateSystem from "./systems/ActorStateSystem";
import GameContext, { GameMode } from "./GameContext";
import { PlayerFactory } from "./factories/PlayerFactory";
import { EnemyFactory } from "./factories/EnemyFactory";
import RenderQueueSystem from "./systems/RenderQueueSystem";

// This is the engine/game loop
export class App {
	private engine: Engine;

	constructor(
		@inject(SceneManagerSystem) private smSystem: SceneManagerSystem,
		@inject(UserInterfaceSystem) private uiSystem: UserInterfaceSystem,
		@inject(RenderQueueSystem) private rqeSystem: RenderQueueSystem,
		@inject(DialogueManagerSystem) private dmSystem: DialogueManagerSystem,
		@inject(CombatManagerSystem) private cmSystem: CombatManagerSystem,
		@inject(ActorStateSystem) private asSystem: ActorStateSystem,
		@inject(PlayerFactory) private playerFactory: PlayerFactory,
		@inject(EnemyFactory) private enemyFactory: EnemyFactory,
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
		await this.startFactories();
		await this.startSystems();

		/* TEST */
		await this.smSystem.createScene(
			this.engine,
			"scene_test",
			"campaign_test",
			GameMode.Combat,
		);
		const context = container.resolve(GameContext);

		const plyrFactory = container.resolve(PlayerFactory);
		const plyerEID = await plyrFactory.createEntityFromFile(
			"cmd_test",
			context.campaignId,
		);
		context.partyInfoHud.setPartyInfoEntryStack();

		container.register(GameContext, {
			useValue: {
				...context,
				selectedPlayerEID: plyerEID,
				playerEIDs: [plyerEID],
			},
		});

		// this.smSystem.setGameMode(GameMode.Explore);
		this.smSystem.setGameMode(GameMode.Combat);
		await this.cmSystem.startCombat("enc_test");
		/* TEST */

		this.engine.runRenderLoop(() => {
			context.scene.render();
			const deltaTime = context.scene.deltaTime / 1000;
			this.updateSystems(deltaTime);
			context.uiScene.render();
			this.uiSystem.update(deltaTime);
		});
	}

	private async startSystems() {
		await this.smSystem.start();
		await this.uiSystem.start(this.engine);
		await this.asSystem.start();
		await this.dmSystem.start();
		await this.cmSystem.start();
		await this.rqeSystem.start();
	}

	private updateSystems(deltaTime: number) {
		this.smSystem.update(deltaTime);
		this.asSystem.update(deltaTime);
		this.dmSystem.update(deltaTime);
		this.cmSystem.update(deltaTime);
		this.rqeSystem.update(deltaTime);
	}

	private async startFactories() {
		await this.playerFactory.start();
		await this.enemyFactory.start();
	}
}
