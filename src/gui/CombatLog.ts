import { Nullable } from "@babylonjs/core";
import {
    Container,
    Control,
    Rectangle,
    ScrollBar,
    StackPanel,
    TextBlock,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Themes } from "./Themes";

export default class CombatLog implements IHUD {
    public rootContainer: Nullable<Container> = null;

    private combatLogStack: Nullable<StackPanel> = null;
    private combatLogScrollbar: Nullable<ScrollBar> = null;

    private readonly SIZE_PER_COMBAT_LOG_ENTRY = 32;

    public createHudRoot(): Container {
        const combatLogUI = new Rectangle("ui_combatLog");
        combatLogUI.color = Themes.primary1;
        combatLogUI.background = `${Themes.primary3}${Themes.dialogueBackgroundOpacity}`;
        combatLogUI.thickness = 1;
        combatLogUI.widthInPixels = 160;
        combatLogUI.heightInPixels = 180;
        combatLogUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        combatLogUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

        const combatLogHeader = this.createCombatLogHeader();
        combatLogUI.addControl(combatLogHeader);

        const combatLogScroll = this.createCombatLogScroll();
        combatLogUI.addControl(combatLogScroll);

        const combatLogStack = this.createCombatLogStack(combatLogScroll);
        combatLogScroll.addControl(combatLogStack);

        const combatLogScrollbar = this.createCombatLogScrollbar();
        combatLogScroll.addControl(combatLogScrollbar);

        this.rootContainer = combatLogUI;

        return this.rootContainer;
    }

    private createCombatLogHeader(): Rectangle {
        const combatLogHeader = new Rectangle("ui_combatLogHeader");
        combatLogHeader.color = Themes.primary1;
        combatLogHeader.background = Themes.primary3;
        combatLogHeader.thickness = 1;
        combatLogHeader.widthInPixels = 160;
        combatLogHeader.heightInPixels = 20;
        combatLogHeader.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        const combatLogLabel = this.createCombatLogLabel();
        combatLogHeader.addControl(combatLogLabel);

        return combatLogHeader;
    }

    private createCombatLogLabel(): TextBlock {
        const combatLogLabel = new TextBlock("ui_combatLogLabel", "COMBAT LOG");
        combatLogLabel.color = Themes.neutral2;
        combatLogLabel.style = Themes.typography.header4;
        combatLogLabel.width = 100;
        combatLogLabel.height = 100;
        combatLogLabel.textVerticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        combatLogLabel.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        return combatLogLabel;
    }

    private createCombatLogScroll(): Container {
        const combatLogScroll = new Container("ui_combatLogScroll");
        combatLogScroll.isPointerBlocker = true;
        combatLogScroll.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        combatLogScroll.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        combatLogScroll.widthInPixels = 160;
        combatLogScroll.heightInPixels = 160;
        combatLogScroll.alpha = 1;
        return combatLogScroll;
    }

    private createCombatLogStack(combatLogScroll: Container): StackPanel {
        const combatLogStack = new StackPanel("ui_combatLogStack");
        combatLogStack.isPointerBlocker = true;
        combatLogStack.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        combatLogStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        combatLogStack.width = 1;
        combatLogStack.spacing = 4;
        combatLogStack.adaptHeightToChildren = true;
        combatLogStack.onControlAddedObservable.add(() => {
            if (!this.combatLogStack || !this.combatLogScrollbar) {
                return;
            }
            const textEntryStackSize =
                (this.combatLogStack.children.length + 2) *
                this.SIZE_PER_COMBAT_LOG_ENTRY;
            if (textEntryStackSize < combatLogScroll.heightInPixels) {
                this.showHideScrollbar(false);
            } else {
                this.showHideScrollbar(true);
                this.combatLogScrollbar.thumbWidth =
                    100 * (combatLogScroll.heightInPixels / textEntryStackSize);
            }
        });
        this.combatLogStack = combatLogStack;
        return combatLogStack;
    }

    private createCombatLogScrollbar(): ScrollBar {
        const combatLogScrollbar = new ScrollBar("ui_textEntryScrollbar");
        combatLogScrollbar.isPointerBlocker = true;
        combatLogScrollbar.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        combatLogScrollbar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        combatLogScrollbar.isVertical = true;
        combatLogScrollbar.isThumbClamped = true;
        combatLogScrollbar.widthInPixels = 8;
        combatLogScrollbar.paddingTopInPixels = 8;
        combatLogScrollbar.paddingBottomInPixels = 8;
        combatLogScrollbar.onValueChangedObservable.add((value) => {
            if (!this.combatLogStack) {
                return;
            }

            const combatEntryStackSize =
                this.combatLogStack.children.length *
                this.SIZE_PER_COMBAT_LOG_ENTRY;
            this.combatLogStack.topInPixels =
                (value / 100) * combatEntryStackSize;
        });
        combatLogScrollbar.value = 0;
        combatLogScrollbar.background = Themes.primary3;
        combatLogScrollbar.color = Themes.neutral1;
        this.combatLogScrollbar = combatLogScrollbar;
        this.showHideScrollbar(false);
        return combatLogScrollbar;
    }

    public showHideHud(show: boolean): void {
        if (!this.rootContainer) {
            return;
        }

        this.rootContainer.isVisible = show;
    }

    public addCombatLogEntry(source: string, text: string) {
        if (!this.combatLogStack || text === "") {
            return;
        }

        const rootContainer = new Rectangle("ui_combatLogNode");
        rootContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        rootContainer.width = 1;
        rootContainer.heightInPixels = this.SIZE_PER_COMBAT_LOG_ENTRY;
        rootContainer.thickness = 0;

        const entryUI = new TextBlock(
            "ui_combatLogEntry",
            `${source}: ${text}`,
        );
        entryUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        entryUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        entryUI.width = 1;
        entryUI.color = Themes.neutral2;
        entryUI.style = Themes.typography.caption;
        entryUI.resizeToFit = true;
        entryUI.textWrapping = 1;
        rootContainer.addControl(entryUI);

        this.combatLogStack.addControl(rootContainer);
    }

    public clearCombatEntries() {
        if (!this.combatLogStack) {
            return;
        }

        this.combatLogStack.clearControls();
        this.showHideScrollbar(true);
    }

    public showHideScrollbar(show: boolean): void {
        if (!this.combatLogScrollbar) {
            return;
        }
        this.combatLogScrollbar.alpha = show ? 1 : 0;
        this.combatLogScrollbar.isEnabled = show ? true : false;
    }
}
