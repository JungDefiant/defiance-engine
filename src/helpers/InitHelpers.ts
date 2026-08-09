import {
	CreateAudioEngineAsync,
	Engine,
	Scene,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { DEFAULT_CAMPAIGN_ID } from "src/constants/GeneralConstants";
import { MainMenuScreen } from "src/gui/screens/MainMenuScreen";
import { container } from "tsyringe";
import { getPublicRoot } from "./Utils";
import { CampaignData } from "src/types/GameTypes";
import AudioState from "src/states/AudioState";
import MainMenuScene from "src/objects/MainMenuScene";

export function registerNewEngine(): Engine {
	const canvas = document.getElementById(
		"gameCanvas",
	)! as any as HTMLCanvasElement;
	const newEngine = new Engine(canvas);
	window.addEventListener("resize", () => {
		newEngine.resize();
	});
	container.register(Engine, { useValue: newEngine });
	return newEngine;
}

export function gotoMainMenu(mainMenuScene: MainMenuScene) {
	const engine = container.resolve(Engine);
	engine.runRenderLoop(() => {
		mainMenuScene.render();
	});
}
