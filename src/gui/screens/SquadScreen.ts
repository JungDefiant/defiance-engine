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
	starSlotUI: Rectangle;
}

export class SquadScreen {
	private rootContainer: Container;

	private nameText: Nullable<TextBlock> = null;
	private portraitImage: Nullable<Image> = null;
	private featsEntryStack: Nullable<StackPanel> = null;
	private featsScrollbar: Nullable<ScrollBar> = null;

	private readonly statValueTexts: TextBlock[] = [];
	private readonly attributeValueTexts: TextBlock[] = [];
	private readonly weaponLabelTexts: TextBlock[] = [];
	private readonly weaponStarSlots: Rectangle[] = [];
	private readonly equipmentLabelTexts: TextBlock[] = [];
	private readonly equipmentStarSlots: Rectangle[] = [];
	private readonly statLabels = [
		"LIFE POINTS",
		"WILL POINTS",
		"ITEM POINTS",
	];
	private readonly statValues = ["100", "80", "40"];
	private readonly attributeLabels = [
		"MIGHT",
		"IMPULSE",
		"GUILE",
		"HEART",
	];
	private readonly slotLabel = "PULSE RIFLE";
	private readonly maxVisibleFeatEntries = 5;

	public constructor() {
		this.rootContainer = new Container("ui_squadScreen");
		this.rootContainer.width = 1;
		this.rootContainer.height = 1;
		this.rootContainer.isPointerBlocker = true;

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
		const statValueText = this.statValueTexts[statIndex];
		if (!statValueText) {
			return;
		}

		statValueText.text = `${Math.round(value)}`;
	}

	public setAttributeValue(attributeIndex: number, value: number): void {
		const attributeValueText = this.attributeValueTexts[attributeIndex];
		if (!attributeValueText) {
			return;
		}

		attributeValueText.text = `${Math.round(value)}`;
	}

	public setWeaponEntry(slotIndex: number, entryName: string): void {
		this.setSlotEntry(this.weaponLabelTexts, slotIndex, entryName);
	}

	public setEquipmentEntry(slotIndex: number, entryName: string): void {
		this.setSlotEntry(this.equipmentLabelTexts, slotIndex, entryName);
	}

	public setWeaponStarVisible(slotIndex: number, visible: boolean): void {
		this.setSlotStarVisible(this.weaponStarSlots, slotIndex, visible);
	}

	public setEquipmentStarVisible(
		slotIndex: number,
		visible: boolean,
	): void {
		this.setSlotStarVisible(this.equipmentStarSlots, slotIndex, visible);
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

		if (entries.length > this.maxVisibleFeatEntries) {
			featsScrollbar.alpha = 1;
			featsScrollbar.thumbWidth =
				(100 * this.maxVisibleFeatEntries) / entries.length;
		} else {
			featsScrollbar.alpha = 0;
			featsScrollbar.thumbWidth = 100;
		}
	}

	private setSlotEntry(
		labelTexts: TextBlock[],
		slotIndex: number,
		entryName: string,
	): void {
		const labelText = labelTexts[slotIndex];
		if (!labelText) {
			return;
		}

		labelText.text = entryName;
	}

	private setSlotStarVisible(
		starSlots: Rectangle[],
		slotIndex: number,
		visible: boolean,
	): void {
		const starSlotUI = starSlots[slotIndex];
		if (!starSlotUI) {
			return;
		}

		starSlotUI.isVisible = visible;
	}

	private createPanelUI(): Container {
		const panelUI = new Rectangle("ui_squadPanel");
		panelUI.widthInPixels = 600;
		panelUI.heightInPixels = 480;
		panelUI.background = Themes.primary3;
		panelUI.color = Themes.primary1;
		panelUI.thickness = 1;
		panelUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		panelUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

		this.buildLeftColumnUI(panelUI);
		this.buildRightColumnUI(panelUI);
		panelUI.addControl(this.createStarSlotStackUI());

		return panelUI;
	}

	private buildLeftColumnUI(panelUI: Container): void {
		panelUI.addControl(this.createPortraitUI());
		panelUI.addControl(this.createNameRowUI());

		for (let i = 0; i < this.statLabels.length; i++) {
			panelUI.addControl(this.createStatRowUI(i));
		}

		panelUI.addControl(
			this.createSectionHeaderUI(
				"ui_squadFeatsHeader",
				"FEATS",
				280,
				40,
				280,
			),
		);
		panelUI.addControl(this.createFeatsListUI());
	}

	private buildRightColumnUI(panelUI: Container): void {
		panelUI.addControl(
			this.createSectionHeaderUI(
				"ui_squadAttributesHeader",
				"ATTRIBUTES",
				240,
				342,
				36,
			),
		);

		for (let i = 0; i < this.attributeLabels.length; i++) {
			panelUI.addControl(this.createAttributeRowUI(i));
		}

		panelUI.addControl(
			this.createSectionHeaderUI(
				"ui_squadWeaponsHeader",
				"WEAPONS",
				240,
				342,
				172,
			),
		);

		for (let i = 0; i < 4; i++) {
			const weaponRowUI = this.createSlotRowUI(
				`ui_squadWeaponRow_${i}`,
				196 + i * 24,
				i === 0,
			);
			panelUI.addControl(weaponRowUI.rowContainer);
			this.weaponLabelTexts.push(weaponRowUI.labelText);
			this.weaponStarSlots.push(weaponRowUI.starSlotUI);
		}

		panelUI.addControl(
			this.createSectionHeaderUI(
				"ui_squadEquipmentHeader",
				"EQUIPMENT",
				240,
				342,
				352,
			),
		);

		for (let i = 0; i < 4; i++) {
			const equipmentRowUI = this.createSlotRowUI(
				`ui_squadEquipmentRow_${i}`,
				352 + i * 24,
				true,
			);
			panelUI.addControl(equipmentRowUI.rowContainer);
			this.equipmentLabelTexts.push(equipmentRowUI.labelText);
			this.equipmentStarSlots.push(equipmentRowUI.starSlotUI);
		}
	}

	private createPortraitUI(): Container {
		const portraitUI = new Rectangle("ui_squadPortrait");
		portraitUI.widthInPixels = 120;
		portraitUI.heightInPixels = 120;
		portraitUI.background = Themes.primary3;
		portraitUI.color = Themes.primary1;
		portraitUI.thickness = 1;
		portraitUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		portraitUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		portraitUI.leftInPixels = 128;
		portraitUI.topInPixels = 36;

		this.portraitImage = new Image("ui_squadPortraitImage", "");
		this.portraitImage.width = 1;
		this.portraitImage.height = 1;
		portraitUI.addControl(this.portraitImage);

		return portraitUI;
	}

	private createNameRowUI(): Container {
		const nameRowUI = new Rectangle("ui_squadNameRow");
		nameRowUI.widthInPixels = 280;
		nameRowUI.heightInPixels = 24;
		nameRowUI.background = Themes.primary3;
		nameRowUI.color = Themes.primary1;
		nameRowUI.thickness = 1;
		nameRowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		nameRowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		nameRowUI.leftInPixels = 40;
		nameRowUI.topInPixels = 172;

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

	private createStatRowUI(statIndex: number): Container {
		const statRowUI = new Container(`ui_squadStatRow_${statIndex}`);
		statRowUI.widthInPixels = 280;
		statRowUI.heightInPixels = 24;
		statRowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		statRowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		statRowUI.leftInPixels = 40;
		statRowUI.topInPixels = 196 + statIndex * 24;

		const statLabelUI = new Rectangle(`ui_squadStatLabel_${statIndex}`);
		statLabelUI.widthInPixels = 160;
		statLabelUI.heightInPixels = 24;
		statLabelUI.background = Themes.primary3;
		statLabelUI.color = Themes.primary1;
		statLabelUI.thickness = 1;
		statLabelUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		statLabelUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		statLabelUI.leftInPixels = 0;
		statRowUI.addControl(statLabelUI);

		const statLabelText = new TextBlock(
			`ui_squadStatLabelText_${statIndex}`,
			this.statLabels[statIndex],
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
		statValueUI.widthInPixels = 120;
		statValueUI.heightInPixels = 24;
		statValueUI.background = Themes.primary3;
		statValueUI.color = Themes.primary1;
		statValueUI.thickness = 1;
		statValueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		statValueUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		statValueUI.leftInPixels = 160;
		statRowUI.addControl(statValueUI);

		const statValueText = new TextBlock(
			`ui_squadStatValueText_${statIndex}`,
			this.statValues[statIndex],
		);
		statValueText.width = 1;
		statValueText.height = 1;
		statValueText.color = Themes.neutral2;
		statValueText.style = Themes.typography.header4;
		statValueText.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		statValueText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		statValueUI.addControl(statValueText);
		this.statValueTexts.push(statValueText);

		return statRowUI;
	}

	private createSectionHeaderUI(
		name: string,
		labelText: string,
		widthInPixels: number,
		leftInPixels: number,
		topInPixels: number,
	): Container {
		const headerUI = new Rectangle(name);
		headerUI.widthInPixels = widthInPixels;
		headerUI.heightInPixels = 24;
		headerUI.background = Themes.primary3;
		headerUI.color = Themes.primary1;
		headerUI.thickness = 1;
		headerUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		headerUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		headerUI.leftInPixels = leftInPixels;
		headerUI.topInPixels = topInPixels;

		const headerText = new TextBlock(`${name}Text`, labelText);
		headerText.width = 1;
		headerText.height = 1;
		headerText.color = Themes.neutral2;
		headerText.style = Themes.typography.header4;
		headerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		headerText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		headerUI.addControl(headerText);

		return headerUI;
	}

	private createAttributeRowUI(attributeIndex: number): Container {
		const attributeRowUI = new Container(
			`ui_squadAttributeRow_${attributeIndex}`,
		);
		attributeRowUI.widthInPixels = 240;
		attributeRowUI.heightInPixels = 24;
		attributeRowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		attributeRowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		attributeRowUI.leftInPixels = 342;
		attributeRowUI.topInPixels = 60 + attributeIndex * 24;

		const attributeLabelUI = new Rectangle(
			`ui_squadAttributeLabel_${attributeIndex}`,
		);
		attributeLabelUI.widthInPixels = 168;
		attributeLabelUI.heightInPixels = 24;
		attributeLabelUI.background = Themes.primary3;
		attributeLabelUI.color = Themes.primary1;
		attributeLabelUI.thickness = 1;
		attributeLabelUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		attributeLabelUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		attributeLabelUI.leftInPixels = 0;
		attributeRowUI.addControl(attributeLabelUI);

		const attributeLabelText = new TextBlock(
			`ui_squadAttributeLabelText_${attributeIndex}`,
			this.attributeLabels[attributeIndex],
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
		attributeValueUI.widthInPixels = 72;
		attributeValueUI.heightInPixels = 24;
		attributeValueUI.background = Themes.primary3;
		attributeValueUI.color = Themes.primary1;
		attributeValueUI.thickness = 1;
		attributeValueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		attributeValueUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		attributeValueUI.leftInPixels = 168;
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
		this.attributeValueTexts.push(attributeValueText);

		return attributeRowUI;
	}

	private createSlotRowUI(
		name: string,
		topInPixels: number,
		starVisible: boolean,
	): SquadSlotRowUI {
		const rowUI = new Rectangle(name);
		rowUI.widthInPixels = 240;
		rowUI.heightInPixels = 24;
		rowUI.background = Themes.primary3;
		rowUI.color = Themes.primary1;
		rowUI.thickness = 1;
		rowUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		rowUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		rowUI.leftInPixels = 342;
		rowUI.topInPixels = topInPixels;

		const rowLabelText = new TextBlock(`${name}Text`, this.slotLabel);
		rowLabelText.width = 1;
		rowLabelText.height = 1;
		rowLabelText.color = Themes.neutral2;
		rowLabelText.style = Themes.typography.header4;
		rowLabelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		rowLabelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		rowUI.addControl(rowLabelText);

		const starSlotUI = new Rectangle(`${name}StarSlot`);
		starSlotUI.widthInPixels = 24;
		starSlotUI.heightInPixels = 24;
		starSlotUI.background = Themes.primary3;
		starSlotUI.color = Themes.primary1;
		starSlotUI.thickness = 1;
		starSlotUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		starSlotUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		starSlotUI.leftInPixels = 0;
		starSlotUI.isVisible = starVisible;

		const starIcon = new TextBlock(`${name}StarIcon`, "★");
		starIcon.width = 1;
		starIcon.height = 1;
		starIcon.color = Themes.primary2;
		starIcon.fontSize = 16;
		starSlotUI.addControl(starIcon);

		rowUI.addControl(starSlotUI);

		return {
			rowContainer: rowUI,
			labelText: rowLabelText,
			starSlotUI: starSlotUI,
		};
	}

	private createFeatsListUI(): Container {
		const featsListUI = new Rectangle("ui_squadFeatsList");
		featsListUI.widthInPixels = 280;
		featsListUI.heightInPixels = 148;
		featsListUI.background = Themes.primary3;
		featsListUI.color = Themes.primary1;
		featsListUI.thickness = 1;
		featsListUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		featsListUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		featsListUI.leftInPixels = 40;
		featsListUI.topInPixels = 304;

		this.featsEntryStack = new StackPanel("ui_squadFeatEntryStack");
		this.featsEntryStack.isVertical = true;
		this.featsEntryStack.spacing = 4;
		this.featsEntryStack.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.featsEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.featsEntryStack.leftInPixels = 4;
		this.featsEntryStack.topInPixels = 4;
		this.featsEntryStack.widthInPixels = 260;
		featsListUI.addControl(this.featsEntryStack);

		this.featsScrollbar = new ScrollBar("ui_squadFeatScrollbar");
		this.featsScrollbar.isVertical = true;
		this.featsScrollbar.isThumbClamped = true;
		this.featsScrollbar.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.featsScrollbar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.featsScrollbar.leftInPixels = -2;
		this.featsScrollbar.topInPixels = 4;
		this.featsScrollbar.widthInPixels = 8;
		this.featsScrollbar.heightInPixels = 140;
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
		entryRowUI.widthInPixels = 260;
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
		entryLabelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		entryRowUI.addControl(entryLabelText);

		return entryRowUI;
	}

	private createStarSlotStackUI(): Container {
		const starSlotStackUI = new StackPanel("ui_squadStarSlotStack");
		starSlotStackUI.isVertical = false;
		starSlotStackUI.spacing = 12;
		starSlotStackUI.adaptWidthToChildren = true;
		starSlotStackUI.adaptHeightToChildren = true;
		starSlotStackUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		starSlotStackUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		starSlotStackUI.topInPixels = -16;

		for (let i = 0; i < 5; i++) {
			starSlotStackUI.addControl(this.createStarSlotUI(i));
		}

		return starSlotStackUI;
	}

	private createStarSlotUI(slotIndex: number): Container {
		const starSlotUI = new Rectangle(`ui_squadStarSlot_${slotIndex}`);
		starSlotUI.widthInPixels = 32;
		starSlotUI.heightInPixels = 32;
		starSlotUI.background = Themes.primary3;
		starSlotUI.color = Themes.primary1;
		starSlotUI.thickness = 1;

		const starIcon = new TextBlock(
			`ui_squadStarSlotIcon_${slotIndex}`,
			"★",
		);
		starIcon.width = 1;
		starIcon.height = 1;
		starIcon.color = Themes.primary2;
		starIcon.fontSize = 20;
		starSlotUI.addControl(starIcon);

		return starSlotUI;
	}
}
