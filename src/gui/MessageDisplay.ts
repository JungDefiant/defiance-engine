import { Nullable } from "@babylonjs/core";
import { Container, Control, Rectangle, TextBlock } from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Themes } from "./Themes";

export default class MessageDisplay implements IHUD {
    public rootContainer: Nullable<Container> = null;

    private messageDisplayText: Nullable<TextBlock> = null;

    public createHudRoot(): Container {
        const messageDisplayUI = new Rectangle("ui_messageDisplay");
        messageDisplayUI.color = Themes.primary1;
        messageDisplayUI.background = Themes.primary3;
        messageDisplayUI.thickness = 1;
        messageDisplayUI.widthInPixels = 280;
        messageDisplayUI.heightInPixels = 48;
        messageDisplayUI.top = 5;
        messageDisplayUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        messageDisplayUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;

        this.messageDisplayText = new TextBlock("ui_messageDisplayText", "");
        this.messageDisplayText.color = Themes.neutral2;
        this.messageDisplayText.style = Themes.typography.header4;
        this.messageDisplayText.width = 100;
        this.messageDisplayText.height = 100;
        this.messageDisplayText.textVerticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        this.messageDisplayText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        messageDisplayUI.addControl(this.messageDisplayText);

        this.rootContainer = messageDisplayUI;
        this.rootContainer.isVisible = false;

        return this.rootContainer;
    }

    public showHideHud(show: boolean): void {
        if (!this.rootContainer) {
            return;
        }

        this.rootContainer.isVisible = show;
    }

    public setMessageDisplay(show: boolean, message?: string) {
        if (!this.rootContainer) {
            return;
        }

        this.rootContainer.isVisible = show;
        if (show && message && this.messageDisplayText) {
            this.messageDisplayText.text = message;
        }
    }
}

