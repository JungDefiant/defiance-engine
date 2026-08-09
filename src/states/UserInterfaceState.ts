import { AdvancedDynamicTexture } from "@babylonjs/gui";
import CombatHUD from "src/gui/CombatHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { ModalScreen } from "src/gui/screens/ModalScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import { VictoryScreen } from "src/gui/screens/VictoryScreen";
import { ModalData } from "src/types/GameTypes";

export default class UserInterfaceState {
	public readonly mainUI: AdvancedDynamicTexture;
	public readonly sceneGUI: AdvancedDynamicTexture;
	public readonly partyInfoHud: PartyInfoHUD;
	public readonly exploreHud: ExploreHUD;
	public readonly dialogueHud: DialogueHUD;
	public readonly combatHud: CombatHUD;
	public readonly tacticalPauseScreen: TacticalPauseScreen;
	public readonly modalScreen: ModalScreen;
	public readonly gameOverScreen: GameOverScreen;
	public readonly victoryScreen: VictoryScreen;
	public readonly modalMap: Map<string, ModalData> = new Map();

	public constructor(newProps: UserInterfaceStateProps) {
		this.mainUI = newProps.mainUI;
		this.sceneGUI = newProps.sceneGUI;
		this.partyInfoHud = newProps.partyInfoHud;
		this.exploreHud = newProps.exploreHud;
		this.dialogueHud = newProps.dialogueHud;
		this.combatHud = newProps.combatHud;
		this.modalScreen = newProps.modalScreen;
		this.tacticalPauseScreen = newProps.tacticalPauseScreen;
		this.gameOverScreen = newProps.gameOverScreen;
		this.victoryScreen = newProps.victoryScreen;
	}
}

export interface UserInterfaceStateProps {
	readonly mainUI: AdvancedDynamicTexture;
	readonly sceneGUI: AdvancedDynamicTexture;
	readonly partyInfoHud: PartyInfoHUD;
	readonly exploreHud: ExploreHUD;
	readonly dialogueHud: DialogueHUD;
	readonly combatHud: CombatHUD;
	readonly tacticalPauseScreen: TacticalPauseScreen;
	readonly modalScreen: ModalScreen;
	readonly gameOverScreen: GameOverScreen;
	readonly victoryScreen: VictoryScreen;
}
