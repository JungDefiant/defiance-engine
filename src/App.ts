import "reflect-metadata";
import { container } from "tsyringe";
import { CreateAudioEngineAsync, Engine, Nullable } from "@babylonjs/core";
import {
	DEFAULT_CAMPAIGN_ID,
	DELTATIME_MS,
} from "src/constants/GeneralConstants";
import { CampaignData as CampaignLoadedJson } from "src/types/GameTypes";
import { getPublicRoot } from "src/helpers/Utils";
import AudioState from "./states/AudioState";
import { SystemRegistry } from "./registries/SystemRegistry";
import { FactoryRegistry } from "./registries/FactoryRegistry";
import { FACTORY_TOKENS, SYSTEM_TOKENS } from "./constants/TokenConstants";
import { GameStateRegistry } from "./registries/GameStateRegistry";
import GameSystem from "./systems/GameSystem";
import { EntityFactory } from "./factories/EntityFactory";
import MainMenuScene from "./objects/MainMenuScene";
import CampaignState from "./states/CampaignState";
import SceneManagerSystem from "./systems/SceneManagerSystem";
import SceneState from "./states/SceneState";
import UserInterfaceState, {
	UserInterfaceStateProps,
} from "./states/UserInterfaceState";
import DialogueState from "./states/DialogueState";
import ControlState from "./states/ControlState";

export class App {
	public mainMenuScene: Nullable<MainMenuScene> = null;

	private systemRegistry: SystemRegistry;
	private factoryRegistry: FactoryRegistry;
	private gameStateRegistry: GameStateRegistry;

	constructor() {
		this.systemRegistry = container.resolve(SystemRegistry);
		this.factoryRegistry = container.resolve(FactoryRegistry);
		this.gameStateRegistry = container.resolve(GameStateRegistry);
	}

	public async startGame() {
		this.stopEngineRenderLoop();
		this.closeMainMenu();
		await this.initGameStates();
		this.registerFactories();
		this.registerSystems();
		await this.startFactories();
		await this.startSystems();
		await this.createStartingScene();
		this.runScene();
	}

	private async createStartingScene() {
		const sceneManagerSystem =
			this.systemRegistry.getGameSystemBySystemId<SceneManagerSystem>(
				SceneManagerSystem.toString(),
			);
		const campaignState =
			this.gameStateRegistry.getGameStateByStateId<CampaignState>(
				CampaignState.toString(),
			);
		await sceneManagerSystem.createNewScene(campaignState.startSceneId);
	}

	private runScene() {
		const app = this;
		const engine = container.resolve(Engine);
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		engine.runRenderLoop(() => {
			sceneState.currentScene.render();
			const deltaTime = sceneState.currentScene.deltaTime / DELTATIME_MS;
			app.updateSystems(deltaTime);
		});
	}

	private stopEngineRenderLoop() {
		const engine = container.resolve(Engine);
		engine.stopRenderLoop();
	}

	public gotoMainMenu() {
		if (!this.mainMenuScene) {
			return;
		}
		const mainMenuScene = this.mainMenuScene;
		const engine = container.resolve(Engine);
		engine.runRenderLoop(() => {
			mainMenuScene.render();
		});
	}

	public closeMainMenu() {
		if (this.mainMenuScene) {
			this.mainMenuScene.dispose();
		}
	}

	private async initGameStates() {
		await this.initCampaignState();
		await this.initAudioState();
		this.initControlState();
		this.initDialogueState();
	}

	private async initCampaignState() {
		const response = await fetch(
			`${getPublicRoot()}/data/${DEFAULT_CAMPAIGN_ID}/campaign.json`,
		);
		const campaignLoadedJson =
			(await response.json()) as CampaignLoadedJson;
		this.gameStateRegistry.registerNewGameState(
			CampaignState.toString(),
			new CampaignState(campaignLoadedJson),
		);
	}

	private async initAudioState() {
		const audioEngine = await CreateAudioEngineAsync({
			disableDefaultUI: true,
		});
		this.gameStateRegistry.registerNewGameState(
			AudioState.toString(),
			new AudioState(audioEngine),
		);
	}

	private initDialogueState() {
		this.gameStateRegistry.registerNewGameState(
			DialogueState.toString(),
			new DialogueState(),
		);
	}

	private initControlState() {
		this.gameStateRegistry.registerNewGameState(
			ControlState.toString(),
			new ControlState(),
		);
	}

	private registerFactories() {
		for (const factoryToken of FACTORY_TOKENS) {
			this.factoryRegistry.registerNewEntityFactory(
				factoryToken.toString(),
				new factoryToken(),
			);
		}
	}

	private registerSystems() {
		for (const systemToken of SYSTEM_TOKENS) {
			this.systemRegistry.registerNewGameSystem(
				systemToken.toString(),
				// Refactor systems to not need constructor params
				new systemToken(),
			);
		}
	}

	private async startFactories() {
		for (const factoryToken of FACTORY_TOKENS) {
			const factory =
				this.factoryRegistry.getEntityFactoryByFactoryId<EntityFactory>(
					factoryToken.toString(),
				);
			await factory.start();
		}
	}

	private async startSystems() {
		const engine = container.resolve(Engine);
		for (const systemToken of SYSTEM_TOKENS) {
			const system =
				this.systemRegistry.getGameSystemBySystemId<GameSystem>(
					systemToken.toString(),
				);
			await system.start(engine);
		}
	}

	private updateSystems(deltaTime: number) {
		for (const systemToken of SYSTEM_TOKENS) {
			const system =
				this.systemRegistry.getGameSystemBySystemId<GameSystem>(
					systemToken.toString(),
				);
			system.update(deltaTime);
		}
	}
}
