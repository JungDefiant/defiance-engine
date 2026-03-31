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
import CombatHUD from "../gui/CombatHUD";
import { CreateTypography as createTypography } from "../gui/Themes";
import { GameMode } from "../GameContext";

export interface IUserInterfaceSystem extends ISystem {
	setGameMode(newMode: GameMode): void;
	getPartyInfoHud(): PartyInfoHUD;
	getExploreHud(): ExploreHUD;
	getDialogueHud(): DialogueHUD;
	getCombatHud(): CombatHUD;
	createGUIScene(engine: Engine): void;
	createPlayerInput(inputMode: GameMode): void;
}

@singleton()
export default class UserInterfaceSystem implements IUserInterfaceSystem {
	public uiScene: Nullable<Scene> = null;

	private fullscreenUI: Nullable<AdvancedDynamicTexture> = null;
	private partyInfoHud: Nullable<PartyInfoHUD> = null;
	private exploreHud: Nullable<ExploreHUD> = null;
	private dialogueHud: Nullable<DialogueHUD> = null;
	private combatHud: Nullable<CombatHUD> = null;

	public async start(engine: Engine) {
		this.uiScene = this.createGUIScene(engine);
	}

	public update() {}

	public setGameMode(newMode: GameMode) {
		this.partyInfoHud?.showHideHud(
			newMode == GameMode.Combat || newMode == GameMode.Explore,
		);
		this.exploreHud?.showHideHud(newMode == GameMode.Explore);
		this.dialogueHud?.showHideHud(newMode == GameMode.Dialogue);
		this.combatHud?.showHideHud(newMode == GameMode.Combat);
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

	public getCombatHud(): CombatHUD {
		return this.combatHud!;
	}

	public createGUIScene(engine: Engine) {
		const uiScene = new Scene(engine);
		uiScene.autoClear = false;

		const camera = new UniversalCamera("cam_gui", Vector3.Zero(), uiScene);

		this.fullscreenUI = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			uiScene,
		);

		createTypography(this.fullscreenUI);

		this.partyInfoHud = new PartyInfoHUD();
		this.fullscreenUI.addControl(this.partyInfoHud.createHudRoot());

		this.exploreHud = new ExploreHUD();
		this.fullscreenUI.addControl(this.exploreHud.createHudRoot());
		this.exploreHud.showHideHud(false);

		this.dialogueHud = new DialogueHUD();
		this.fullscreenUI.addControl(this.dialogueHud.createHudRoot());
		this.dialogueHud.showHideHud(false);

		this.combatHud = new CombatHUD();
		this.fullscreenUI.addControl(this.combatHud.createHudRoot());
		this.combatHud.showHideHud(false);

		// this.createEndCombatScreen();
		// this.createGameSettingsScreen();
		return uiScene;
	}

	public createPlayerInput(inputMode: GameMode) {}
}
