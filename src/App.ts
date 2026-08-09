import "reflect-metadata";
import { container } from "tsyringe";
import { CreateAudioEngineAsync, Engine } from "@babylonjs/core";
import { DEFAULT_CAMPAIGN_ID } from "src/constants/GeneralConstants";
import { CampaignData } from "src/types/GameTypes";
import { getPublicRoot } from "src/helpers/Utils";
import AudioState from "./states/AudioState";
import { SystemRegistry } from "./registries/SystemRegistry";
import { FactoryRegistry } from "./registries/FactoryRegistry";
import {
	COMPONENT_TOKENS,
	FACTORY_TOKENS,
	STATE_TOKENS,
	SYSTEM_TOKENS,
} from "./constants/TokenConstants";
import { GameStateRegistry } from "./registries/GameStateRegistry";
import { ComponentRegistry } from "./registries/ComponentRegistry";
import { stat } from "fs";
import GameSystem from "./systems/GameSystem";
import { EntityFactory } from "./factories/EntityFactory";

export class App {
	private systemRegistry: SystemRegistry;
	private factoryRegistry: FactoryRegistry;
	private gameStateRegistry: GameStateRegistry;

	constructor() {
		this.systemRegistry = container.resolve(SystemRegistry);
		this.factoryRegistry = container.resolve(FactoryRegistry);
		this.gameStateRegistry = container.resolve(GameStateRegistry);
	}

	public async startGame() {
		const engine = container.resolve(Engine);
		engine.stopRenderLoop();
		this.mainMenuScene.dispose();

		const response = await fetch(
			`${getPublicRoot()}/data/${DEFAULT_CAMPAIGN_ID}/campaign.json`,
		);
		const campaignData = (await response.json()) as CampaignData;
		container.register("CampaignData", { useValue: campaignData });

		const audioEngine = await CreateAudioEngineAsync({
			disableDefaultUI: true,
		});
		container.register(AudioState, {
			useValue: new AudioState(audioEngine),
		});

		this.registerFactories();
		this.registerSystems();
		await this.startFactories();
		await this.startSystems(engine);
		await smSystem.createNewScene(this.engine, campaignData);
		await smSystem.runScene(this.engine, this);
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
				new systemToken(),
			);
		}
	}

	private async startSystems(engine: Engine) {
		for (const systemToken of SYSTEM_TOKENS) {
			const system =
				this.systemRegistry.getGameSystemBySystemId<GameSystem>(
					systemToken.toString(),
				);
			await system.start(engine);
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

	private updateSystems(deltaTime: number) {
		this.smSystem.update(deltaTime);
		this.asSystem.update(deltaTime);
		this.entityMovementSystem.update(deltaTime);
		this.dmSystem.update(deltaTime);
		this.cmSystem.update(deltaTime);
		this.rqeSystem.update(deltaTime);
		this.imageAnimationSystem.update(deltaTime);
		this.ehSystem.update(deltaTime);
		this.uiSystem.update(deltaTime);
	}
}
