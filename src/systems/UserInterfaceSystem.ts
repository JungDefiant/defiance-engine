import { singleton } from "tsyringe";
import ISystem from "./ISystem";
import {
	Engine,
	Nullable,
	Scene,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import PartyInfoHUD from "../gui/PartyInfoHUD";
import ExploreHUD from "../gui/ExploreHUD";
import DialogueHUD from "../gui/DialogueHUD";

@singleton()
export default class UserInterfaceSystem implements ISystem {
	public uiScene: Nullable<Scene> = null;

	private fullscreenUI: Nullable<AdvancedDynamicTexture> = null;
	private partyInfoHud: Nullable<PartyInfoHUD> = null;
	private exploreHud: Nullable<ExploreHUD> = null;
	private dialogueHud: Nullable<DialogueHUD> = null;

	public async start(engine: Engine) {
		this.createGUIScene(engine);
		this.setGameMode(GameMode.Explore);
	}

	public update() {}

	public setGameMode(newMode: GameMode) {
		this.partyInfoHud?.showHideHud(
			newMode == GameMode.Combat || newMode == GameMode.Explore,
		);
		this.exploreHud?.showHideHud(newMode == GameMode.Explore);
		this.dialogueHud?.showHideHud(newMode == GameMode.Dialogue);
	}

	public getPartyInfoHud(): PartyInfoHUD {
		return this.partyInfoHud!;
	}

	public getExploreHud(): ExploreHUD {
		return this.exploreHud!;
	}

	public getDialogueHud(): DialogueHUD {
		return this.dialogueHud!;
	}

	public createGUIScene(engine: Engine) {
		this.uiScene = new Scene(engine);
		this.uiScene.autoClear = false;

		const camera = new UniversalCamera("cam_gui", Vector3.Zero(), this.uiScene);

		this.fullscreenUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			this.uiScene,
		);

		this.partyInfoHud = new PartyInfoHUD();
		this.partyInfoHud.createHUD(this.fullscreenUI);

		this.exploreHud = new ExploreHUD();
		this.exploreHud.createHUD(this.fullscreenUI);
		this.exploreHud.showHideHud(false);

		this.dialogueHud = new DialogueHUD();
		this.dialogueHud.createHUD(this.fullscreenUI);
		this.dialogueHud.showHideHud(false);

		// this.createDialogueHUD();
		// this.createCombatHUD();
		// this.createEndCombatScreen();
		// this.createGameSettingsScreen();
	}

	public createDialogueHUD() {}

	public createCombatHUD() {}

	public createEndCombatScreen() {}

	public createGameSettingsScreen() {}

	public displayPartyInfoHUD(show: boolean) {}

	public displayExploreHUD(show: boolean) {}

	public displayDialogueHUD(show: boolean) {}

	public displayCombatHUD(show: boolean) {}

	public displayEndCombatScreen(show: boolean) {}

	public displayGameSettingsScreen(show: boolean) {}

	public setPlayerInput(inputMode: GameMode) {}
}

export enum GameMode {
	MainMenu,
	Combat,
	Explore,
	Dialogue,
}
