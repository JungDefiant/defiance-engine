import { Mesh, Nullable } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import ActionBarHUD from "src/gui/ActionBarHUD";
import CombatLog from "src/gui/CombatLog";
import DialogueHUD from "src/gui/DialogueHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import MessageDisplay from "src/gui/MessageDisplay";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { ModalScreen } from "src/gui/screens/ModalScreen";
import { SquadScreen } from "src/gui/screens/SquadScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import { LoadedModalJson } from "src/types/GameTypes";

export default class UserInterfaceState {
    public readonly mainUI: AdvancedDynamicTexture;
    public readonly sceneGUI: AdvancedDynamicTexture;
    public readonly partyInfoHud: PartyInfoHUD;
    public readonly exploreHud: ExploreHUD;
    public readonly dialogueHud: DialogueHUD;
    public readonly actionBarHUD: ActionBarHUD;
    public readonly combatLogUI: CombatLog;
    public readonly messageDisplayUI: MessageDisplay;
    public readonly tacticalPauseScreen: TacticalPauseScreen;
    public readonly modalScreen: ModalScreen;
    public readonly gameOverScreen: GameOverScreen;
    public readonly squadScreen: SquadScreen;
    public readonly modalMap: Map<string, LoadedModalJson> = new Map();
    public targetHighlightMesh: Nullable<Mesh> = null;

    public constructor(newProps: UserInterfaceStateProps) {
        this.mainUI = newProps.mainUI;
        this.sceneGUI = newProps.sceneUI;
        this.partyInfoHud = newProps.partyInfoHud;
        this.exploreHud = newProps.exploreHud;
        this.dialogueHud = newProps.dialogueHud;
        this.actionBarHUD = newProps.actionBarHud;
        this.combatLogUI = newProps.combatLogUI;
        this.messageDisplayUI = newProps.messageDisplayUI;
        this.modalScreen = newProps.modalScreen;
        this.tacticalPauseScreen = newProps.tacticalPauseScreen;
        this.gameOverScreen = newProps.gameOverScreen;
        this.squadScreen = newProps.squadScreen;
    }
}

export interface UserInterfaceStateProps {
    readonly mainUI: AdvancedDynamicTexture;
    readonly sceneUI: AdvancedDynamicTexture;
    readonly partyInfoHud: PartyInfoHUD;
    readonly exploreHud: ExploreHUD;
    readonly dialogueHud: DialogueHUD;
    readonly actionBarHud: ActionBarHUD;
    readonly combatLogUI: CombatLog;
    readonly messageDisplayUI: MessageDisplay;
    readonly tacticalPauseScreen: TacticalPauseScreen;
    readonly modalScreen: ModalScreen;
    readonly gameOverScreen: GameOverScreen;
    readonly squadScreen: SquadScreen;
}
