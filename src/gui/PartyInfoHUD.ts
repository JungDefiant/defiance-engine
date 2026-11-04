import { Nullable } from "@babylonjs/core";
import { Container, Control, Rectangle, StackPanel } from "@babylonjs/gui";
import IHUD from "src/gui/IHUD";
import { Themes } from "src/gui/Themes";
import { getPlayerGuiComponentArray } from "src/modules/ComponentModule";
import { getGameplayState } from "src/modules/GameStateModule";

export default class PartyInfoHUD implements IHUD {
    public rootContainer: Nullable<Container> = null;

    private partyInfoEntryStack: Nullable<StackPanel> = null;

    public showHideHud(show: boolean): void {
        this.rootContainer!.isVisible = show ? true : false;
    }

    public createHudRoot(): Container {
        this.rootContainer = new Container("ui_partyInfoHud");
        this.rootContainer.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.rootContainer.widthInPixels = 360;
        this.rootContainer.heightInPixels = 88;
        this.rootContainer.topInPixels = -4;

        return this.rootContainer;
    }

    public setPartyInfoEntryStack() {
        if (!this.rootContainer) {
            return;
        }

        this.partyInfoEntryStack = new StackPanel("ui_partyInfoEntryStack");
        this.partyInfoEntryStack.isVertical = false;
        this.partyInfoEntryStack.spacing = 4;

        const playerGuiComponentArray = getPlayerGuiComponentArray();
        const gameplayState = getGameplayState();

        for (const [eid, entry] of playerGuiComponentArray.entries()) {
            if (!entry) {
                continue;
            }
            this.partyInfoEntryStack.addControl(entry.getRoot());
            entry.setSelected(gameplayState.selectedPlayerEID === eid);
        }

        this.rootContainer.addControl(this.partyInfoEntryStack);
    }
}
