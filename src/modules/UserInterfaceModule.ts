import { Texture, UniversalCamera, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import CombatHUD from "src/gui/CombatHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { ModalScreen } from "src/gui/screens/ModalScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import { VictoryScreen } from "src/gui/screens/VictoryScreen";
import { UserInterfaceScene } from "src/scenes/UserInterfaceScene";
import UserInterfaceState, {
	UserInterfaceStateProps,
} from "src/states/UserInterfaceState";
import {
	getCampaignState,
	getGameplayState,
	getGameScene,
	getGameStateRegistry,
	getUserInterfaceScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { CreateTypography } from "src/gui/Themes";
import { GameScene } from "src/scenes/GameScene";
import { getPublicRoot } from "./Utils";
import { GameMode, LoadedModalJson } from "src/types/GameTypes";
import { EntityId } from "bitecs";
import { getPlayerGuiComponentArray } from "./ComponentModule";
import { resetCombatModeControls } from "./ControlModule";

export async function loadModalMap(modalIds: string[]): Promise<void> {
	const campaignState = getCampaignState();
	const userInterfaceState = getUserInterfaceState();

	modalIds.forEach(async (ref) => {
		const response = await fetch(
			`${getPublicRoot()}/data/${campaignState.campaignId}/modals/${ref}.json`,
		);
		const modalJson = (await response.json()) as LoadedModalJson;

		if (!modalJson) {
			return;
		}

		userInterfaceState.modalMap.set(modalJson.id, modalJson);
	});
}

export async function clearSceneGUI() {
	const userInterfaceState = getUserInterfaceState();
	userInterfaceState.sceneGUI.getChildren().forEach((control) => {
		control.dispose();
	});
}

function createMainUI(uiScene: UserInterfaceScene) {
	const mainUI = AdvancedDynamicTexture.CreateFullscreenUI(
		"ui_main",
		true,
		uiScene,
		Texture.NEAREST_SAMPLINGMODE,
	);
	mainUI.idealWidth = 800;
	mainUI.idealHeight = 600;
	return mainUI;
}

function createSceneUI(scene: GameScene) {
	const sceneGUI = AdvancedDynamicTexture.CreateFullscreenUI(
		"ui_scene",
		true,
		scene,
		Texture.NEAREST_SAMPLINGMODE,
	);
	sceneGUI.idealWidth = 800;
	sceneGUI.idealHeight = 600;
	return sceneGUI;
}

function createUICamera(uiScene: UserInterfaceScene) {
	return new UniversalCamera("cam_gui", Vector3.Zero(), uiScene);
}

function createVictoryScreen(mainUI: AdvancedDynamicTexture) {
	const victoryScreen = new VictoryScreen();
	mainUI.addControl(victoryScreen.getRoot());
	victoryScreen.showHide(false);
	return victoryScreen;
}

function createGameOverScreen(mainUI: AdvancedDynamicTexture) {
	const gameOverScreen = new GameOverScreen();
	mainUI.addControl(gameOverScreen.getRoot());
	gameOverScreen.showHide(false);
	return gameOverScreen;
}

function createModalScreen(mainUI: AdvancedDynamicTexture) {
	const modalScreen = new ModalScreen();
	mainUI.addControl(modalScreen.getRoot());
	return modalScreen;
}

function createDialogueHUD(mainUI: AdvancedDynamicTexture) {
	const dialogueHud = new DialogueHUD();
	mainUI.addControl(dialogueHud.createHudRoot());
	dialogueHud.showHideHud(false);
	return dialogueHud;
}

function createPartyInfoHUD(mainUI: AdvancedDynamicTexture) {
	const partyInfoHud = new PartyInfoHUD();
	mainUI.addControl(partyInfoHud.createHudRoot());
	return partyInfoHud;
}

function createTacticalPauseScreen(mainUI: AdvancedDynamicTexture) {
	const tacticalPauseScreen = new TacticalPauseScreen();
	mainUI.addControl(tacticalPauseScreen.getRoot());
	tacticalPauseScreen.showHide(false);
	return tacticalPauseScreen;
}

function createCombatHUD(mainUI: AdvancedDynamicTexture) {
	const combatHud = new CombatHUD();
	mainUI.addControl(combatHud.createHudRoot());
	combatHud.showHideHud(false);
	return combatHud;
}

function createExploreHUD(mainUI: AdvancedDynamicTexture) {
	const exploreHud = new ExploreHUD();
	mainUI.addControl(exploreHud.createHudRoot());
	exploreHud.showHideHud(false);
	return exploreHud;
}

export function initUserInterfaceState() {
	const userInterfaceScene = getUserInterfaceScene();
	const sceneUI = createSceneUI(getGameScene());
	const mainUI = createMainUI(userInterfaceScene);
	const uiCamera = createUICamera(userInterfaceScene);
	userInterfaceScene.activeCamera = uiCamera;
	CreateTypography(mainUI);
	document.fonts.ready.then(() => {
		mainUI.markAsDirty();
	});
	document.fonts.ready.then(() => {
		sceneUI.markAsDirty();
	});
	const exploreHud = createExploreHUD(mainUI);
	const combatHud = createCombatHUD(mainUI);
	const tacticalPauseScreen = createTacticalPauseScreen(mainUI);
	const partyInfoHud = createPartyInfoHUD(mainUI);
	const dialogueHud = createDialogueHUD(mainUI);
	const modalScreen = createModalScreen(mainUI);
	const gameOverScreen = createGameOverScreen(mainUI);
	const victoryScreen = createVictoryScreen(mainUI);
	const newUserInterfaceState = new UserInterfaceState({
		mainUI,
		sceneUI,
		exploreHud,
		combatHud,
		tacticalPauseScreen,
		partyInfoHud,
		dialogueHud,
		modalScreen,
		gameOverScreen,
		victoryScreen,
	} as UserInterfaceStateProps);
	getGameStateRegistry().registerNewGameState(
		UserInterfaceState.toString(),
		newUserInterfaceState,
	);
	console.log("USER INTERFACE STATE", newUserInterfaceState);
	return newUserInterfaceState;
}

export function clearCombatHudEntries() {
	const userInterfaceState = getUserInterfaceState();
	userInterfaceState.combatHud.clearCombatEntries();
}

export function setUserInterfaceGameMode(newMode: GameMode) {
	const userInterfaceState = getUserInterfaceState();
	userInterfaceState.partyInfoHud.showHideHud(
		newMode == GameMode.Combat || newMode == GameMode.Explore,
	);
	userInterfaceState.exploreHud.showHideHud(newMode == GameMode.Explore);
	userInterfaceState.dialogueHud.showHideHud(newMode == GameMode.Dialogue);
	userInterfaceState.combatHud.showHideHud(newMode == GameMode.Combat);
}

export function setSelectedCharacter(eid: EntityId, isCombatMode?: boolean) {
	const gameplayState = getGameplayState();

	if (!gameplayState.playerEIDs.includes(eid)) {
		return;
	}

	const playerGuiComponentArray = getPlayerGuiComponentArray();

	gameplayState.selectedPlayerEID = eid;
	playerGuiComponentArray.forEach((gui, eid) => {
		if (eid === gameplayState.selectedPlayerEID) {
			gui.setSelected(true);
		} else {
			gui.setSelected(false);
		}
	});

	if (isCombatMode) {
		resetCombatModeControls();
	}
}
