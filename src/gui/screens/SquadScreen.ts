import { Nullable } from "@babylonjs/core";
import {
    Container,
    Control,
    Image,
    Rectangle,
    ScrollBar,
    StackPanel,
    TextBlock,
} from "@babylonjs/gui";
import { Themes } from "../Themes";

interface SquadSlotRowUI {
    rowContainer: Rectangle;
    labelText: TextBlock;
    buttonUI: Rectangle;
}

export class SquadScreen {
    private rootContainer: Container;

    private nameText: Nullable<TextBlock> = null;
    private portraitImage: Nullable<Image> = null;
    private featsEntryStack: Nullable<StackPanel> = null;
    private featsScrollbar: Nullable<ScrollBar> = null;
    private weaponLabelTextBlock: Nullable<TextBlock> = null;

    private statValueTextBlocks: TextBlock[] = [];
    private attributeValueTextBlocks: TextBlock[] = [];
    private powerLabelTextBlocks: TextBlock[] = [];
    private equipmentLabelTextBlocks: TextBlock[] = [];

    private readonly STAT_LABELS = [
        "LIFE POINTS",
        "WILL POINTS",
        "ITEM POINTS",
    ];
    private readonly ATTRIBUTE_LABELS = ["MIGHT", "IMPULSE", "GUILE", "HEART"];
    private readonly MAX_VISIBLE_FEAT_ENTRIES = 5;
    private readonly SCREEN_WIDTH = 600;
    private readonly SCREEN_HEIGHT = 480;
    private readonly COLUMN_CONTENT_WIDTH = 260;
    private readonly COLUMN_SPACING = 12;

    public constructor() {
        this.rootContainer = new Container("ui_squadScreen");
        this.rootContainer.width = 1;
        this.rootContainer.height = 1;
        this.rootContainer.isPointerBlocker = true;

        const backgroundUI = new Rectangle("ui_squadScreenBackground");
        backgroundUI.width = 1;
        backgroundUI.height = 1;
        backgroundUI.thickness = 0;
        backgroundUI.background = Themes.primary3;
        this.rootContainer.addControl(backgroundUI);

        const panelUI = this.createPanelUI();
        this.rootContainer.addControl(panelUI);
    }

    public getRoot(): Container {
        return this.rootContainer;
    }

    public showHide(show: boolean): void {
        this.rootContainer.isVisible = show;
    }

    public setSquadMemberName(name: string): void {
        if (!this.nameText) {
            return;
        }

        this.nameText.text = name;
    }

    public setPortraitImage(imageSrc: string): void {
        if (!this.portraitImage) {
            return;
        }

        this.portraitImage.source = imageSrc;
    }

    public setStatValue(statIndex: number, value: number): void {
        const statValueText = this.statValueTextBlocks[statIndex];
        if (!statValueText) {
            return;
        }

        statValueText.text = `${Math.round(value)}`;
    }

    public setAttributeValue(attributeIndex: number, value: number): void {
        const attributeValueText =
            this.attributeValueTextBlocks[attributeIndex];
        if (!attributeValueText) {
            return;
        }

        attributeValueText.text = `${Math.round(value)}`;
    }

    public setWeaponEntry(entryName: string): void {
        if (!this.weaponLabelTextBlock) {
            return;
        }

        this.setLabelText(this.weaponLabelTextBlock, entryName);
    }

    public setPowerEntry(slotIndex: number, entryName: string): void {
        this.setLabelText(this.powerLabelTextBlocks[slotIndex], entryName);
    }

    public setEquipmentEntry(slotIndex: number, entryName: string): void {
        this.setLabelText(this.equipmentLabelTextBlocks[slotIndex], entryName);
    }

    public setFeatEntries(entries: string[]): void {
        const featsEntryStack = this.featsEntryStack;
        if (!featsEntryStack) {
            return;
        }

        featsEntryStack.clearControls();

        entries.forEach((entry, index) => {
            featsEntryStack.addControl(this.createFeatEntryRowUI(index, entry));
        });

        const featsScrollbar = this.featsScrollbar;
        if (!featsScrollbar) {
            return;
        }

        if (entries.length > this.MAX_VISIBLE_FEAT_ENTRIES) {
            featsScrollbar.alpha = 1;
            featsScrollbar.thumbWidth =
                (100 * this.MAX_VISIBLE_FEAT_ENTRIES) / entries.length;
        } else {
            featsScrollbar.alpha = 0;
            featsScrollbar.thumbWidth = 100;
        }
    }

    private setLabelText(labelText: TextBlock, entryName: string): void {
        if (!labelText) {
            return;
        }

        labelText.text = entryName;
    }

    private createPanelUI(): Container {
        const panelUI = new Rectangle("ui_squadPanel");
        panelUI.widthInPixels = this.SCREEN_WIDTH;
        panelUI.heightInPixels = this.SCREEN_HEIGHT;
        panelUI.background = Themes.primary3;
        panelUI.color = Themes.primary1;
        panelUI.thickness = 1;
        panelUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panelUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        panelUI.clipContent = false;

        const columnStackPanel = new StackPanel("ui_columnStackPanel");
        columnStackPanel.width = 1;
        columnStackPanel.height = 1;
        columnStackPanel.isVertical = false;
        panelUI.addControl(columnStackPanel);

        const leftColumnStack = this.buildLeftColumnUI();
        columnStackPanel.addControl(leftColumnStack);

        const rightColumnStack = this.buildRightColumnUI();
        columnStackPanel.addControl(rightColumnStack);

        const menuBar = this.createMenuBarUI();
        panelUI.addControl(menuBar);

        return panelUI;
    }

    private buildLeftColumnUI(): StackPanel {
        const leftColumnStack = new StackPanel("");
        leftColumnStack.widthInPixels = this.SCREEN_WIDTH / 2;
        leftColumnStack.heightInPixels = this.SCREEN_HEIGHT;
        leftColumnStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        leftColumnStack.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftColumnStack.spacing = this.COLUMN_SPACING;
        leftColumnStack.topInPixels = 32;

        const portraitUI = this.createPortraitUI();
        leftColumnStack.addControl(portraitUI);

        const nameRowUI = this.createNameRowUI();
        leftColumnStack.addControl(nameRowUI);

        const statRowStackPanel = new StackPanel("ui_statRowStackPanel");
        leftColumnStack.addControl(statRowStackPanel);

        for (let i = 0; i < this.STAT_LABELS.length; i++) {
            const statRowUI = this.createStatRowUI(i);
            statRowStackPanel.addControl(statRowUI);
        }

        const featsSectionStackPanel = new StackPanel(
            "ui_featsSectionStackPanel",
        );
        leftColumnStack.addControl(featsSectionStackPanel);

        const featsSectionHeaderUI = this.createSectionHeaderUI(
            "ui_squadFeatsHeader",
            "FEATS",
        );
        featsSectionStackPanel.addControl(featsSectionHeaderUI);

        const featsListUI = this.createFeatsListUI();
        featsSectionStackPanel.addControl(featsListUI);

        return leftColumnStack;
    }

    private buildRightColumnUI(): StackPanel {
        const rightColumnStack = new StackPanel("");
        rightColumnStack.widthInPixels = this.SCREEN_WIDTH / 2;
        rightColumnStack.heightInPixels = this.SCREEN_HEIGHT;
        rightColumnStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        rightColumnStack.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        rightColumnStack.spacing = this.COLUMN_SPACING;
        rightColumnStack.topInPixels = 32;

        const squadAttributesStackPanel = new StackPanel(
            "ui_squadAttributesStackPanel",
        );
        rightColumnStack.addControl(squadAttributesStackPanel);

        const squadAttributesHeaderUI = this.createSectionHeaderUI(
            "ui_squadAttributesHeader",
            "ATTRIBUTES",
        );
        squadAttributesStackPanel.addControl(squadAttributesHeaderUI);

        for (let i = 0; i < this.ATTRIBUTE_LABELS.length; i++) {
            const attributeRowUI = this.createAttributeRowUI(i);
            squadAttributesStackPanel.addControl(attributeRowUI);
        }

        const weaponSectionStackPanel = new StackPanel(
            "ui_weaponSectionStackPanel",
        );
        rightColumnStack.addControl(weaponSectionStackPanel);

        const weaponSectionHeaderUI = this.createSectionHeaderUI(
            "ui_squadWeaponsHeader",
            "WEAPON",
        );
        weaponSectionStackPanel.addControl(weaponSectionHeaderUI);

        const weaponRowUI = this.createSlotRowUI(
            "ui_squadWeaponRow",
            "Weapon",
            0,
            true,
        );
        weaponSectionStackPanel.addControl(weaponRowUI.rowContainer);

        const powerSectionStackPanel = new StackPanel(
            "ui_powerSectionStackPanel",
        );
        rightColumnStack.addControl(powerSectionStackPanel);

        const powerSectionHeaderUI = this.createSectionHeaderUI(
            "ui_squadPowersHeader",
            "POWERS",
        );
        powerSectionStackPanel.addControl(powerSectionHeaderUI);

        for (let i = 0; i < 3; i++) {
            const powerRowUI = this.createSlotRowUI(
                `ui_squadWeaponRow_${i}`,
                "Power",
                i * 24,
                false,
            );
            powerSectionStackPanel.addControl(powerRowUI.rowContainer);
        }

        const equipmentSectionStackPanel = new StackPanel(
            "ui_equipmentSectionStackPanel",
        );
        rightColumnStack.addControl(equipmentSectionStackPanel);

        const squadEquipmentHeaderUI = this.createSectionHeaderUI(
            "ui_squadEquipmentHeader",
            "EQUIPMENT",
        );
        equipmentSectionStackPanel.addControl(squadEquipmentHeaderUI);

        for (let i = 0; i < 4; i++) {
            const equipmentRowUI = this.createSlotRowUI(
                `ui_squadEquipmentRow_${i}`,
                "Equipment",
                i * 24,
                true,
            );
            equipmentSectionStackPanel.addControl(equipmentRowUI.rowContainer);
            this.equipmentLabelTextBlocks.push(equipmentRowUI.labelText);
        }

        return rightColumnStack;
    }

    private createPortraitUI(): Container {
        const portraitUI = new Rectangle("ui_squadPortrait");
        portraitUI.widthInPixels = 120;
        portraitUI.heightInPixels = 120;
        portraitUI.background = Themes.primary3;
        portraitUI.color = Themes.primary1;
        portraitUI.thickness = 1;
        portraitUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        portraitUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        this.portraitImage = new Image("ui_squadPortraitImage", "");
        this.portraitImage.width = 1;
        this.portraitImage.height = 1;
        portraitUI.addControl(this.portraitImage);

        return portraitUI;
    }

    private createNameRowUI(): Container {
        const nameRowUI = new Rectangle("ui_squadNameRow");
        nameRowUI.widthInPixels = this.COLUMN_CONTENT_WIDTH;
        nameRowUI.heightInPixels = 24;
        nameRowUI.background = Themes.primary3;
        nameRowUI.color = Themes.primary1;
        nameRowUI.thickness = 1;
        nameRowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        nameRowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        this.nameText = new TextBlock("ui_squadNameText", "");
        this.nameText.width = 1;
        this.nameText.height = 1;
        this.nameText.color = Themes.neutral2;
        this.nameText.style = Themes.typography.bodyText;
        this.nameText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.nameText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        nameRowUI.addControl(this.nameText);

        return nameRowUI;
    }

    private createStatRowUI(statIndex: number): StackPanel {
        const statRowUI = new StackPanel(`ui_squadStatRow_${statIndex}`);
        statRowUI.widthInPixels = this.COLUMN_CONTENT_WIDTH;
        statRowUI.heightInPixels = 24;
        statRowUI.isVertical = false;
        statRowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        statRowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        statRowUI.topInPixels = statIndex * 24;

        const statLabelUI = new Rectangle(`ui_squadStatLabel_${statIndex}`);
        statLabelUI.widthInPixels = 160;
        statLabelUI.heightInPixels = 24;
        statLabelUI.background = Themes.primary3;
        statLabelUI.color = Themes.primary1;
        statLabelUI.thickness = 1;
        statLabelUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        statLabelUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        statRowUI.addControl(statLabelUI);

        const statLabelText = new TextBlock(
            `ui_squadStatLabelText_${statIndex}`,
            this.STAT_LABELS[statIndex],
        );
        statLabelText.width = 1;
        statLabelText.height = 1;
        statLabelText.color = Themes.neutral2;
        statLabelText.style = Themes.typography.header4;
        statLabelText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        statLabelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        statLabelUI.addControl(statLabelText);

        const statValueUI = new Rectangle(`ui_squadStatValue_${statIndex}`);
        statValueUI.widthInPixels = 100;
        statValueUI.heightInPixels = 24;
        statValueUI.background = Themes.primary3;
        statValueUI.color = Themes.primary1;
        statValueUI.thickness = 1;
        statValueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        statValueUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        statRowUI.addControl(statValueUI);

        const statValueText = new TextBlock(
            `ui_squadStatValueText_${statIndex}`,
            this.STAT_LABELS[statIndex],
        );
        statValueText.width = 1;
        statValueText.height = 1;
        statValueText.color = Themes.neutral2;
        statValueText.style = Themes.typography.header4;
        statValueText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        statValueText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        statValueUI.addControl(statValueText);
        this.statValueTextBlocks.push(statValueText);

        return statRowUI;
    }

    private createSectionHeaderUI(name: string, labelText: string): Container {
        const headerUI = new Rectangle(name);
        headerUI.widthInPixels = this.COLUMN_CONTENT_WIDTH;
        headerUI.heightInPixels = 24;
        headerUI.background = Themes.primary3;
        headerUI.color = Themes.primary1;
        headerUI.thickness = 1;
        headerUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        headerUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        const headerText = new TextBlock(`${name}Text`, labelText);
        headerText.width = 1;
        headerText.height = 1;
        headerText.color = Themes.neutral2;
        headerText.style = Themes.typography.header4;
        headerText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        headerText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        headerUI.addControl(headerText);

        return headerUI;
    }

    private createAttributeRowUI(attributeIndex: number): Container {
        const attributeRowUI = new StackPanel(
            `ui_squadAttributeRow_${attributeIndex}`,
        );
        attributeRowUI.widthInPixels = this.COLUMN_CONTENT_WIDTH;
        attributeRowUI.heightInPixels = 24;
        attributeRowUI.isVertical = false;
        attributeRowUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        attributeRowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        attributeRowUI.topInPixels = attributeIndex * 24;

        const attributeLabelUI = new Rectangle(
            `ui_squadAttributeLabel_${attributeIndex}`,
        );
        attributeLabelUI.widthInPixels = 160;
        attributeLabelUI.heightInPixels = 24;
        attributeLabelUI.background = Themes.primary3;
        attributeLabelUI.color = Themes.primary1;
        attributeLabelUI.thickness = 1;
        attributeLabelUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        attributeLabelUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        attributeRowUI.addControl(attributeLabelUI);

        const attributeLabelText = new TextBlock(
            `ui_squadAttributeLabelText_${attributeIndex}`,
            this.ATTRIBUTE_LABELS[attributeIndex],
        );
        attributeLabelText.width = 1;
        attributeLabelText.height = 1;
        attributeLabelText.color = Themes.neutral2;
        attributeLabelText.style = Themes.typography.header4;
        attributeLabelText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        attributeLabelText.textVerticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        attributeLabelUI.addControl(attributeLabelText);

        const attributeValueUI = new Rectangle(
            `ui_squadAttributeValue_${attributeIndex}`,
        );
        attributeValueUI.widthInPixels = 100;
        attributeValueUI.heightInPixels = 24;
        attributeValueUI.background = Themes.primary3;
        attributeValueUI.color = Themes.primary1;
        attributeValueUI.thickness = 1;
        attributeValueUI.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        attributeValueUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        attributeRowUI.addControl(attributeValueUI);

        const attributeValueText = new TextBlock(
            `ui_squadAttributeValueText_${attributeIndex}`,
            "4",
        );
        attributeValueText.width = 1;
        attributeValueText.height = 1;
        attributeValueText.color = Themes.neutral2;
        attributeValueText.style = Themes.typography.header4;
        attributeValueText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        attributeValueText.textVerticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        attributeValueUI.addControl(attributeValueText);
        this.attributeValueTextBlocks.push(attributeValueText);

        return attributeRowUI;
    }

    private createSlotRowUI(
        name: string,
        label: string,
        topInPixels: number = 0,
        hasButton: boolean = false,
    ): SquadSlotRowUI {
        const rowUI = new Rectangle(name);
        rowUI.widthInPixels = this.COLUMN_CONTENT_WIDTH;
        rowUI.heightInPixels = 24;
        rowUI.background = Themes.primary3;
        rowUI.color = Themes.primary1;
        rowUI.thickness = 1;
        rowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        rowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        rowUI.topInPixels = topInPixels;

        const rowLabelText = new TextBlock(`${name}Text`, label);
        rowLabelText.width = 1;
        rowLabelText.height = 1;
        rowLabelText.color = Themes.neutral2;
        rowLabelText.style = Themes.typography.header4;
        rowLabelText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        rowLabelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        rowUI.addControl(rowLabelText);

        const buttonUI = new Rectangle(`${name}Button`);
        buttonUI.widthInPixels = 24;
        buttonUI.heightInPixels = 24;
        buttonUI.background = Themes.primary3;
        buttonUI.color = Themes.primary1;
        buttonUI.thickness = 1;
        buttonUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        buttonUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        buttonUI.isVisible = hasButton;

        const buttonIcon = new TextBlock(`${name}ButtonIcon`, "★");
        buttonIcon.width = 1;
        buttonIcon.height = 1;
        buttonIcon.color = Themes.primary2;
        buttonIcon.fontSize = 16;
        buttonUI.addControl(buttonIcon);

        rowUI.addControl(buttonUI);

        return {
            rowContainer: rowUI,
            labelText: rowLabelText,
            buttonUI: buttonUI,
        };
    }

    private createFeatsListUI(): Container {
        const featsListHeight = 148;
        const featsListUI = new Rectangle("ui_squadFeatsList");
        featsListUI.widthInPixels = this.COLUMN_CONTENT_WIDTH;
        featsListUI.heightInPixels = featsListHeight;
        featsListUI.background = Themes.primary3;
        featsListUI.color = Themes.primary1;
        featsListUI.thickness = 1;
        featsListUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        featsListUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        this.featsEntryStack = new StackPanel("ui_squadFeatEntryStack");
        this.featsEntryStack.isVertical = true;
        this.featsEntryStack.spacing = 4;
        this.featsEntryStack.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.featsEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.featsEntryStack.widthInPixels = this.COLUMN_CONTENT_WIDTH - 20;
        featsListUI.addControl(this.featsEntryStack);

        this.featsScrollbar = new ScrollBar("ui_squadFeatScrollbar");
        this.featsScrollbar.isVertical = true;
        this.featsScrollbar.isThumbClamped = true;
        this.featsScrollbar.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.featsScrollbar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.featsScrollbar.widthInPixels = 8;
        this.featsScrollbar.heightInPixels = featsListHeight - 20;
        this.featsScrollbar.background = Themes.neutral1;
        this.featsScrollbar.color = Themes.primary2;
        this.featsScrollbar.value = 0;
        featsListUI.addControl(this.featsScrollbar);

        this.setFeatEntries(["X", "X", "X", "X", "X"]);

        return featsListUI;
    }

    private createFeatEntryRowUI(
        entryIndex: number,
        entryText: string,
    ): Container {
        const entryRowUI = new Rectangle(`ui_squadFeatEntry_${entryIndex}`);
        entryRowUI.widthInPixels = this.COLUMN_CONTENT_WIDTH - 40;
        entryRowUI.heightInPixels = 24;
        entryRowUI.background = Themes.primary3;
        entryRowUI.color = Themes.primary1;
        entryRowUI.thickness = 1;

        const entryLabelText = new TextBlock(
            `ui_squadFeatEntryText_${entryIndex}`,
            entryText,
        );
        entryLabelText.width = 1;
        entryLabelText.height = 1;
        entryLabelText.color = Themes.neutral2;
        entryLabelText.style = Themes.typography.header4;
        entryLabelText.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        entryLabelText.textVerticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        entryRowUI.addControl(entryLabelText);

        return entryRowUI;
    }

    private createMenuBarUI(): Container {
        const menuBarUI = new StackPanel("ui_squadStarSlotStack");
        menuBarUI.isVertical = false;
        menuBarUI.spacing = 12;
        menuBarUI.adaptWidthToChildren = true;
        menuBarUI.adaptHeightToChildren = true;
        menuBarUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        menuBarUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        menuBarUI.topInPixels = -16;

        for (let i = 0; i < 5; i++) {
            menuBarUI.addControl(this.createMenuButtonUI(i));
        }

        return menuBarUI;
    }

    private createMenuButtonUI(slotIndex: number): Container {
        const menuButtonUI = new Rectangle(`ui_menuButton_${slotIndex}`);
        menuButtonUI.widthInPixels = 32;
        menuButtonUI.heightInPixels = 32;
        menuButtonUI.background = Themes.primary3;
        menuButtonUI.color = Themes.primary1;
        menuButtonUI.thickness = 1;

        const menuIcon = new TextBlock(`ui_menuButtonIcon_${slotIndex}`, "★");
        menuIcon.width = 1;
        menuIcon.height = 1;
        menuIcon.color = Themes.primary2;
        menuIcon.fontSize = 20;
        menuButtonUI.addControl(menuIcon);

        return menuButtonUI;
    }
}
