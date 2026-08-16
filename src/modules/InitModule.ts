import { Engine } from "@babylonjs/core";
import AudioState from "src/states/AudioState";
import { container } from "tsyringe";
import {
	initAudioState,
	initGameplayState,
	initGameScene,
} from "./SceneModule";
import {
	getCampaignState,
	getGameScene,
	getSystemRegistry,
	getUserInterfaceScene,
} from "./GameStateModule";
import {
	DEFAULT_CAMPAIGN_ID,
	DELTATIME_MS,
} from "src/constants/GeneralConstants";
import { getPublicRoot } from "./Utils";
import { LoadedCampaignJson } from "src/types/GameTypes";
import CampaignState from "src/states/CampaignState";
import { GameScene } from "src/scenes/GameScene";
import {
	COMPONENT_TOKENS,
	FACTORY_TOKENS,
	STATE_TOKENS,
	SYSTEM_TOKENS,
} from "src/constants/TokenConstants";
import MainMenuScene from "src/scenes/MainMenuScene";
import { EntityFactory } from "src/factories/EntityFactory";
import GameSystem from "src/systems/GameSystem";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { createUserInterfaceState } from "./UserInterfaceModule";
import { ComponentRegistry } from "src/registries/ComponentRegistry";

export async function gotoMainMenu() {
	const mainMenuScene = container.resolve(MainMenuScene);
	const engine = container.resolve(Engine);
	mainMenuScene.audioState = await initAudioState();
	engine.runRenderLoop(() => {
		mainMenuScene.render();
	});
}

export function closeMainMenu() {
	const mainMenuScene = container.resolve(MainMenuScene);
	mainMenuScene.dispose();
}

export function createNewEngine(): Engine {
	const canvas = document.getElementById(
		"gameCanvas",
	)! as any as HTMLCanvasElement;
	const newEngine = new Engine(canvas);
	window.addEventListener("resize", () => {
		newEngine.resize();
	});
	return newEngine;
}

export async function startGame() {
	stopEngineRenderLoop();
	closeMainMenu();
	await createCampaignState();
	await createStartingScene();
	runScene();
}

async function createStartingScene() {
	const campaignState = getCampaignState();
	await initGameScene(campaignState.startSceneId);
}

async function runScene() {
	const engine = container.resolve(Engine);
	const gameScene = getGameScene();
	const userInterfaceScene = getUserInterfaceScene();
	const systemRegistry = getSystemRegistry();
	engine.runRenderLoop(() => {
		gameScene.render();
		userInterfaceScene.render();
		const deltaTime = gameScene.deltaTime / DELTATIME_MS;
		updateSystems(deltaTime, systemRegistry);
	});
}

async function stopEngineRenderLoop() {
	const engine = container.resolve(Engine);
	engine.stopRenderLoop();
}

async function createCampaignState() {
	const response = await fetch(
		`${getPublicRoot()}/data/${DEFAULT_CAMPAIGN_ID}/campaign.json`,
	);
	const campaignLoadedJson = (await response.json()) as LoadedCampaignJson;
	const newCampaignState = new CampaignState(campaignLoadedJson);
	container.register(CampaignState, { useValue: newCampaignState });
}

export function registerFactories(factoryRegistry: FactoryRegistry) {
	for (const factoryToken of FACTORY_TOKENS) {
		factoryRegistry.registerNewEntityFactory(
			factoryToken.toString(),
			new factoryToken(),
		);
	}
}

export function registerSystems(
	systemRegistry: SystemRegistry,
	gameScene: GameScene,
) {
	for (const systemToken of SYSTEM_TOKENS) {
		systemRegistry.registerNewGameSystem(
			systemToken.toString(),
			new systemToken(gameScene),
		);
	}
}

export async function registerStates(
	gameStateRegistry: GameStateRegistry,
	gameScene: GameScene,
) {
	gameStateRegistry.registerNewGameState(
		AudioState.toString(),
		await initAudioState(),
	);

	for (const stateToken of STATE_TOKENS) {
		gameStateRegistry.registerNewGameState(
			stateToken.toString(),
			new stateToken(),
		);
	}

	initGameplayState(gameScene.cameraEntityId);
}

export async function registerComponentArrays(
	componentRegistry: ComponentRegistry,
) {
	for (const componentToken of COMPONENT_TOKENS) {
		componentRegistry.registerNewComponentArray(componentToken.toString());
	}
}

export async function startFactories(factoryRegistry: FactoryRegistry) {
	for (const factoryToken of FACTORY_TOKENS) {
		const factory =
			factoryRegistry.getEntityFactoryByFactoryId<EntityFactory>(
				factoryToken.toString(),
			);
		await factory.start();
	}
}

function updateSystems(deltaTime: number, systemRegistry: SystemRegistry) {
	for (const systemToken of SYSTEM_TOKENS) {
		const system = systemRegistry.getGameSystemBySystemId<GameSystem>(
			systemToken.toString(),
		);
		system.update(deltaTime);
	}
}
