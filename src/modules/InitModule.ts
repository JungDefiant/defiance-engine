import { Engine } from "@babylonjs/core";
import AudioState from "src/states/AudioState";
import { container } from "tsyringe";
import { initAudioState, initGameScene } from "./SceneModule";
import { getCampaignState, getGameScene } from "./GameStateModule";
import {
	DEFAULT_CAMPAIGN_ID,
	DELTATIME_MS,
} from "src/constants/GeneralConstants";
import { getPublicRoot } from "./Utils";
import { LoadedCampaignJson } from "src/types/GameTypes";
import CampaignState from "src/states/CampaignState";
import { GameScene } from "src/scenes/GameScene";
import {
	FACTORY_TOKENS,
	STATE_TOKENS,
	SYSTEM_TOKENS,
} from "src/constants/TokenConstants";
import MainMenuScene from "src/scenes/MainMenuScene";
import { EntityFactory } from "src/factories/EntityFactory";
import GameSystem from "src/systems/GameSystem";

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
	await initCampaignState();
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
	engine.runRenderLoop(() => {
		gameScene.render();
		const deltaTime = gameScene.deltaTime / DELTATIME_MS;
		updateSystems(deltaTime, gameScene);
	});
}

async function stopEngineRenderLoop() {
	const engine = container.resolve(Engine);
	engine.stopRenderLoop();
}

async function initCampaignState() {
	const response = await fetch(
		`${getPublicRoot()}/data/${DEFAULT_CAMPAIGN_ID}/campaign.json`,
	);
	const campaignLoadedJson = (await response.json()) as LoadedCampaignJson;
	const newCampaignState = new CampaignState(campaignLoadedJson);
	container.register(CampaignState, { useValue: newCampaignState });
}

export function registerStates(gameScene: GameScene) {
	for (const stateToken of STATE_TOKENS) {
		gameScene.gameStateRegistry.registerNewGameState(
			stateToken.toString(),
			new stateToken(),
		);
	}
}

export function registerFactories(gameScene: GameScene) {
	for (const factoryToken of FACTORY_TOKENS) {
		gameScene.factoryRegistry.registerNewEntityFactory(
			factoryToken.toString(),
			new factoryToken(),
		);
	}
}

export function registerSystems(gameScene: GameScene) {
	for (const systemToken of SYSTEM_TOKENS) {
		gameScene.systemRegistry.registerNewGameSystem(
			systemToken.toString(),
			new systemToken(gameScene),
		);
	}
}

export async function startFactories(gameScene: GameScene) {
	for (const factoryToken of FACTORY_TOKENS) {
		const factory =
			gameScene.factoryRegistry.getEntityFactoryByFactoryId<EntityFactory>(
				factoryToken.toString(),
			);
		await factory.start();
	}
}

function updateSystems(deltaTime: number, gameScene: GameScene) {
	for (const systemToken of SYSTEM_TOKENS) {
		const system =
			gameScene.systemRegistry.getGameSystemBySystemId<GameSystem>(
				systemToken.toString(),
			);
		system.update(deltaTime);
	}
}
