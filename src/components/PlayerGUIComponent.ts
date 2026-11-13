import {
    Control,
    Grid,
    Rectangle,
    Image,
    StackPanel,
    TextBlock,
    Container,
} from "@babylonjs/gui";
import { EntityId } from "bitecs";
import { Themes } from "../gui/Themes";
import { Component } from "./Component";
import { setSelectedCharacter } from "src/modules/CharacterModule";
import { clamp } from "src/modules/Utils";

export default class PlayerGUIComponent implements Component {
    private rootContainer: Container;
    private backgroundUI: Rectangle;
    private highlightUI: Rectangle;
    private recoveryBarBgUI: Rectangle;
    private recoveryBarFillUI: Rectangle;
    private lifePointsTextUI: TextBlock;
    private willPointsTextUI: TextBlock;
    private itemPointsTextUI: TextBlock;
    private queueActionBgUI: Rectangle;
    private queueActionIconUI: Image;
    private portraitUI: Image;
    private statusIconsUI: Grid;
    private statusIcons: Map<string, Rectangle> = new Map<string, Rectangle>();

    private readonly GUI_WIDTH = 80;
    private readonly GUI_HEIGHT = 80;
    private readonly STATUS_ICON_SLOTS: number = 6;
    private readonly PIXELS_PER_STATUS_SLOT = 12;
    private readonly NUMBER_STATUS_SLOTS = 2;
    private readonly POINT_STACK_WIDTH = 36;
    private readonly POINT_STACK_HEIGHT = 36;
    private readonly POINT_STACK_TOP = -12;
    private readonly POINT_STACK_NUMBER_ROWS = 3;

    public getRoot(): Container {
        return this.rootContainer;
    }

    public constructor(
        entityId: EntityId,
        charName: string,
        spriteSrc: string,
    ) {
        this.rootContainer = new Container();
        this.rootContainer.widthInPixels = this.GUI_WIDTH;
        this.rootContainer.heightInPixels = this.GUI_HEIGHT;
        this.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.rootContainer.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.rootContainer.clipContent = false;

        this.highlightUI = new Rectangle("ui_playerHighlightUI_" + entityId);
        this.highlightUI.widthInPixels = this.GUI_WIDTH + 8;
        this.highlightUI.heightInPixels = this.GUI_HEIGHT + 8;
        this.highlightUI.thickness = 0;
        this.highlightUI.color = Themes.primary2;
        this.highlightUI.background = "";
        this.highlightUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.highlightUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.rootContainer.addControl(this.highlightUI);

        this.backgroundUI = new Rectangle("ui_playerBgUI_" + entityId);
        this.backgroundUI.widthInPixels = this.GUI_WIDTH;
        this.backgroundUI.heightInPixels = this.GUI_HEIGHT;
        this.backgroundUI.thickness = 2;
        this.backgroundUI.color = Themes.primary1;
        this.backgroundUI.background = Themes.primary3;
        this.backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.backgroundUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.backgroundUI.onPointerClickObservable.add(() => {
            setSelectedCharacter(entityId);
        });
        this.rootContainer.addControl(this.backgroundUI);

        this.portraitUI = this.createPortraitUI(entityId, spriteSrc);
        this.rootContainer.addControl(this.portraitUI);

        const rootStackPanel = new StackPanel("ui_rootStackPanel_" + entityId);
        rootStackPanel.widthInPixels = this.GUI_WIDTH;
        rootStackPanel.heightInPixels = this.GUI_HEIGHT;
        rootStackPanel.spacing = 0;
        rootStackPanel.isVertical = true;
        rootStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        rootStackPanel.onPointerClickObservable.add(() => {
            setSelectedCharacter(entityId);
        });
        this.rootContainer.addControl(rootStackPanel);

        const { queueActionUI, queueActionBgUI } =
            this.createQueueActionUI(entityId);
        this.queueActionBgUI = queueActionBgUI;
        this.queueActionIconUI = queueActionUI;
        this.rootContainer.addControl(queueActionBgUI);

        const {
            pointStackUI,
            lifePointsTextUI,
            willPointsTextUI,
            itemPointsTextUI,
        } = this.createPointStackUI(entityId);
        this.lifePointsTextUI = lifePointsTextUI;
        this.willPointsTextUI = willPointsTextUI;
        this.itemPointsTextUI = itemPointsTextUI;
        this.rootContainer.addControl(pointStackUI);

        const { recoveryBarBgUI, recoveryBarFillUI } =
            this.createRecoveryBarUI(entityId);
        this.recoveryBarBgUI = recoveryBarBgUI;
        this.recoveryBarFillUI = recoveryBarFillUI;
        this.rootContainer.addControl(recoveryBarBgUI);

        this.statusIconsUI = this.createStatusIconsUI(entityId);
        this.rootContainer.addControl(this.statusIconsUI);
    }

    public getValue(): PlayerGUIComponent {
        return this;
    }

    public dispose(): void {
        this.getRoot().dispose();
    }

    public setSelected(isSelected: boolean): void {
        if (isSelected) {
            this.highlightUI.thickness = 8;
        } else {
            this.highlightUI.thickness = 0;
        }
    }

    public setRecoveryBarFill(currValue: number, maxValue: number): void {
        this.recoveryBarFillUI.width = clamp(currValue / maxValue || 0, 0, 1);
    }

    public setRecoveryBarVisible(isVisible: boolean): void {
        this.recoveryBarBgUI.isVisible = isVisible;
    }

    public setLifePoints(value: number): void {
        this.lifePointsTextUI.text = `${Math.round(value)}`;
    }

    public setWillPoints(value: number): void {
        this.willPointsTextUI.text = `${Math.round(value)}`;
    }

    public setItemPoints(value: number): void {
        this.itemPointsTextUI.text = `${Math.round(value)}`;
    }

    public setQueuedAction(iconSrc: string): void {
        this.queueActionIconUI.source = iconSrc;
    }

    public setQueuedActionVisible(isVisible: boolean): void {
        this.queueActionBgUI.isVisible = isVisible;
    }

    public addStatusIcon(id: string, iconSrc: string): void {
        if (this.statusIcons.has(id)) {
            this.removeStatusIcon(id);
        }

        const statusIcon = new Rectangle(`ui_statusIcon_${id}`);
        statusIcon.widthInPixels = 16;
        statusIcon.heightInPixels = 16;
        statusIcon.thickness = 0;
        statusIcon.background = "";

        const statusIconImg = new Image(`ui_statusIconImg_${id}`);
        statusIconImg.widthInPixels = 16;
        statusIconImg.heightInPixels = 16;
        statusIconImg.source = iconSrc;
        statusIconImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        statusIconImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        statusIcon.addControl(statusIconImg);

        this.statusIcons.set(id, statusIcon);
        this.layoutStatusIcons();
    }

    public removeStatusIcon(id: string): void {
        const statusIcon = this.statusIcons.get(id);
        if (!statusIcon) {
            return;
        }

        this.statusIconsUI.removeControl(statusIcon);
        this.statusIcons.delete(id);
        this.layoutStatusIcons();
    }

    private createStatusIconsUI(entityId: number) {
        this.statusIconsUI = new Grid(`ui_playerStatusIcons_${entityId}`);
        this.statusIconsUI.widthInPixels =
            this.STATUS_ICON_SLOTS * this.PIXELS_PER_STATUS_SLOT;
        this.statusIconsUI.heightInPixels =
            this.NUMBER_STATUS_SLOTS * this.PIXELS_PER_STATUS_SLOT;
        this.statusIconsUI.topInPixels = 4;
        this.statusIconsUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.statusIconsUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        for (let column = 0; column < this.STATUS_ICON_SLOTS; column++) {
            this.statusIconsUI.addColumnDefinition(
                this.PIXELS_PER_STATUS_SLOT,
                true,
            );
        }
        this.statusIconsUI.addRowDefinition(this.PIXELS_PER_STATUS_SLOT, true);
        this.statusIconsUI.addRowDefinition(this.PIXELS_PER_STATUS_SLOT, true);

        for (let column = 0; column < this.STATUS_ICON_SLOTS; column++) {
            this.statusIconsUI.addControl(
                this.createStatusSlotUI(entityId, column),
                0,
                column,
            );
        }
        return this.statusIconsUI;
    }

    private createPortraitUI(entityId: number, spriteSrc: string) {
        const portraitUI = new Image("ui_portraitUI_" + entityId, spriteSrc);
        portraitUI.widthInPixels = 80;
        portraitUI.heightInPixels = 80;
        portraitUI.highlightColor = "";
        portraitUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        portraitUI.detectPointerOnOpaqueOnly = true;
        portraitUI.onPointerClickObservable.add(() => {
            setSelectedCharacter(entityId);
        });
        return portraitUI;
    }

    private createQueueActionUI(entityId: number) {
        const queueActionBgUI = new Rectangle(
            `ui_playerQueueActionBg_${entityId}`,
        );
        queueActionBgUI.widthInPixels = 16;
        queueActionBgUI.heightInPixels = 16;
        queueActionBgUI.thickness = 1;
        queueActionBgUI.color = Themes.primary1;
        queueActionBgUI.background = Themes.primary3;
        queueActionBgUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        queueActionBgUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        queueActionBgUI.leftInPixels = -4;
        queueActionBgUI.topInPixels = -12;

        const queueActionIconUI = new Image(`ui_playerQueueAction_${entityId}`);
        queueActionIconUI.widthInPixels = 16;
        queueActionIconUI.heightInPixels = 16;
        queueActionIconUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        queueActionIconUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        queueActionBgUI.addControl(queueActionIconUI);

        return { queueActionUI: queueActionIconUI, queueActionBgUI };
    }

    private createRecoveryBarUI(entityId: number) {
        const recoveryBarBgUI = new Rectangle(`ui_actBarBgUI_${entityId}`);
        recoveryBarBgUI.widthInPixels = 80;
        recoveryBarBgUI.heightInPixels = 8;
        recoveryBarBgUI.thickness = 2;
        recoveryBarBgUI.color = Themes.primary1;
        recoveryBarBgUI.background = Themes.primary3;
        recoveryBarBgUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

        const recoveryBarFillUI = this.createBarFillUI(
            entityId,
            "recovery",
            Themes.secondary2,
        );
        recoveryBarBgUI.addControl(recoveryBarFillUI);

        return { recoveryBarFillUI, recoveryBarBgUI };
    }

    private createPointStackUI(entityId: number) {
        const pointStackUI = new Grid(`ui_playerStatRow_${entityId}`);
        pointStackUI.widthInPixels = this.POINT_STACK_WIDTH;
        pointStackUI.heightInPixels = this.POINT_STACK_HEIGHT;
        pointStackUI.topInPixels = this.POINT_STACK_TOP;
        pointStackUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        pointStackUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        for (let i = 0; i < this.POINT_STACK_NUMBER_ROWS; i++) {
            pointStackUI.addRowDefinition(
                this.POINT_STACK_HEIGHT / this.POINT_STACK_NUMBER_ROWS,
                true,
            );
        }
        pointStackUI.addColumnDefinition(this.POINT_STACK_WIDTH, true);

        const lifePointsCellUI = this.createPointCellUI(entityId, "life");
        pointStackUI.addControl(lifePointsCellUI, 0, 0);

        const lifePointsIconUI = this.createIconUI(
            entityId,
            "lifePoints",
            "/sprites/gui/icons/stats/icon_lifepoints.png",
        );
        lifePointsCellUI.addControl(lifePointsIconUI);

        const lifePointsTextUI = this.createPointTextUI(
            entityId,
            "life",
            Themes.neutral2,
        );
        lifePointsCellUI.addControl(lifePointsTextUI);

        const willPointsCellUI = this.createPointCellUI(entityId, "will");
        pointStackUI.addControl(willPointsCellUI, 1, 0);

        const willPointsIconUI = this.createIconUI(
            entityId,
            "willPoints",
            "/sprites/gui/icons/stats/icon_willpoints.png",
        );
        willPointsCellUI.addControl(willPointsIconUI);

        const willPointsTextUI = this.createPointTextUI(
            entityId,
            "will",
            Themes.neutral2,
        );
        willPointsCellUI.addControl(willPointsTextUI);

        const itemPointsCellUI = this.createPointCellUI(entityId, "item");
        pointStackUI.addControl(itemPointsCellUI, 2, 0);

        const itemPointsIconUI = this.createIconUI(
            entityId,
            "itemPoints",
            "/sprites/gui/icons/stats/icon_itempoints.png",
        );
        itemPointsCellUI.addControl(itemPointsIconUI);

        const itemPointsTextUI = this.createPointTextUI(
            entityId,
            "item",
            Themes.neutral2,
        );
        itemPointsCellUI.addControl(itemPointsTextUI);

        return {
            pointStackUI,
            lifePointsTextUI,
            willPointsTextUI,
            itemPointsTextUI,
        };
    }

    private layoutStatusIcons(): void {
        let iconIndex = 0;
        for (const statusIcon of this.statusIcons.values()) {
            this.statusIconsUI.removeControl(statusIcon);
            this.statusIconsUI.addControl(
                statusIcon,
                Math.floor(iconIndex / this.STATUS_ICON_SLOTS),
                iconIndex % this.STATUS_ICON_SLOTS,
            );
            iconIndex++;
        }
    }

    private createStatusSlotUI(eid: EntityId, index: number): Rectangle {
        const paddingAmount = 2;
        const slotUI = new Rectangle(`ui_statusSlot_${index}_${eid}`);
        slotUI.thickness = 0;
        slotUI.background = "";
        slotUI.setPaddingInPixels(0, paddingAmount, paddingAmount, 0);
        return slotUI;
    }

    private createPointCellUI(eid: EntityId, name: string): StackPanel {
        const cellUI = new StackPanel(`ui_${name}StatCellUI_${eid}`);
        cellUI.isVertical = false;
        cellUI.color = "";
        cellUI.background = Themes.primary3 + Themes.dialogueBackgroundOpacity;
        cellUI.spacing = 4;
        cellUI.leftInPixels = 2;
        return cellUI;
    }

    private createPointTextUI(
        eid: EntityId,
        name: string,
        color: string,
    ): TextBlock {
        const valueUI = new TextBlock(`ui_${name}StatValueUI_${eid}`);
        valueUI.widthInPixels = 24;
        valueUI.heightInPixels = 16;
        valueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        valueUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        valueUI.leftInPixels = 4;
        valueUI.style = Themes.typography.caption;
        valueUI.color = color;
        valueUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        valueUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        return valueUI;
    }

    private createBarFillUI(eid: EntityId, name: string, color: string) {
        const barFillUI = new Rectangle(`ui_${name}BarUIFill_${eid}`);
        barFillUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        barFillUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        barFillUI.width = 0;
        barFillUI.heightInPixels = 8;
        barFillUI.color = color;
        barFillUI.background = color;
        return barFillUI;
    }

    private createIconUI(eid: EntityId, name: string, source: string) {
        const iconUI = new Image(`ui_${name}Icon_${eid}`, source);
        iconUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        iconUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        iconUI.widthInPixels = 8;
        iconUI.heightInPixels = 8;
        return iconUI;
    }
}
