import "reflect-metadata";
import { container, inject } from "tsyringe";
import { Engine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import CombatManagerSystem from "src/systems/CombatManagerSystem";
import ActorStateSystem from "src/systems/ActorStateSystem";
import GameState from "src/states/GameState";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { EnemyFactory } from "src/factories/EnemyFactory";
import RenderQueueSystem from "src/systems/RenderQueueSystem";
import { MainMenuScreen } from "src/gui/screens/MainMenuScreen";
import { DEFAULT_CAMPAIGN_ID } from "src/Constants";
import { CampaignData } from "src/states/GameData";
import { getPublicRoot } from "src/Utils";
import EventHandlerSystem from "src/systems/EventHandlerSystem";

export class App {
	private engine: Engine;
	private mainMenuScene: Scene;

	constructor(
		@inject(SceneManagerSystem) private smSystem: SceneManagerSystem,
		@inject(UserInterfaceSystem) private uiSystem: UserInterfaceSystem,
		@inject(RenderQueueSystem) private rqeSystem: RenderQueueSystem,
		@inject(DialogueManagerSystem) private dmSystem: DialogueManagerSystem,
		@inject(CombatManagerSystem) private cmSystem: CombatManagerSystem,
		@inject(ActorStateSystem) private asSystem: ActorStateSystem,
		@inject(EventHandlerSystem) private ehSystem: EventHandlerSystem,
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

		this.mainMenuScene = new Scene(this.engine);
		this.mainMenuScene.autoClear = false;

		const mainMenuScreen = new MainMenuScreen(this.mainMenuScene, this);
		const uiCamera = new UniversalCamera(
			"cam_gui",
			Vector3.Zero(),
			this.mainMenuScene,
		);
	}

	public gotoMainMenu() {
		this.engine.runRenderLoop(() => {
			this.mainMenuScene.render();
		});
	}

	public async startGame() {
		this.engine.stopRenderLoop();
		this.mainMenuScene.dispose();

		const response = await fetch(
			`${getPublicRoot()}/data/${DEFAULT_CAMPAIGN_ID}/campaign.json`,
		);
		const campaignData = (await response.json()) as CampaignData;
		container.register("CampaignData", { useValue: campaignData });

		await this.startFactories();
		await this.startSystems();
		await this.smSystem.createScene(
			this.engine,
			campaignData.startSceneId,
			campaignData.id,
			campaignData.startingPartyIds,
		);
		await this.smSystem.runScene(this.engine, this);
	}

	public updateSystems(deltaTime: number, gameState: GameState) {
		this.smSystem.update(deltaTime);
		this.asSystem.update(deltaTime);
		this.dmSystem.update(deltaTime);
		this.cmSystem.update(deltaTime, gameState);
		this.rqeSystem.update(deltaTime, gameState);
		this.ehSystem.update(deltaTime, gameState);
		this.uiSystem.update(deltaTime, gameState);
	}

	private async startSystems() {
		await this.smSystem.start();
		await this.uiSystem.start(this.engine);
		await this.asSystem.start();
		await this.dmSystem.start();
		await this.cmSystem.start();
		await this.rqeSystem.start();
		await this.ehSystem.start();
	}

	private async startFactories() {
		await this.playerFactory.start();
		await this.enemyFactory.start();
	}
}
