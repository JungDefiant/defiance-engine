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

const STATUS_ICON_SLOTS: number = 4;

export default class PlayerGUIComponent implements Component {
	private rootContainer: Container;
	private targetingUI: Image;
	private backgroundUI: Rectangle;
	private charNameBgUI: Rectangle;
	private charNameUI: TextBlock;
	private actBarBgUI: Rectangle;
	private actBarFillUI: Rectangle;
	private lifeValueUI: TextBlock;
	private willValueUI: TextBlock;
	private itemValueUI: TextBlock;
	private queueActionBgUI: Rectangle;
	private queueActionUI: Image;
	private statusIconsUI: Grid;
	private statusIcons: Map<string, Rectangle> = new Map<string, Rectangle>();

	public getRoot(): Container {
		return this.rootContainer;
	}

	public constructor(eid: EntityId, charName: string, spriteSrc: string) {
		this.rootContainer = new Container();
		this.rootContainer.widthInPixels = 152;
		this.rootContainer.heightInPixels = 152;
		this.rootContainer.top = -4;
		this.rootContainer.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_BOTTOM;

		this.targetingUI = new Image(
			`ui_enBattlerTargetings_${eid}`,
			"sprites/particles/magic_03.png",
		);
		this.targetingUI.widthInPixels = 72;
		this.targetingUI.heightInPixels = 72;
		this.targetingUI.shadowOffsetX = 4;
		this.targetingUI.shadowOffsetY = 4;
		this.targetingUI.onPointerEnterObservable.add(() => {
			this.targetingUI.shadowColor = "red";
		});
		this.targetingUI.onPointerOutObservable.add(() => {
			this.targetingUI.shadowColor = "#00000000";
		});
		this.targetingUI.onPointerClickObservable.add(() => {});
		this.targetingUI.isVisible = false;
		this.rootContainer.addControl(this.targetingUI);

		this.backgroundUI = new Rectangle("ui_playerBgUI_" + eid);
		this.backgroundUI.width = 1;
		this.backgroundUI.height = 1;
		this.backgroundUI.thickness = 1;
		this.backgroundUI.background = Themes.primary3;
		this.backgroundUI.color = Themes.primary1;
		this.backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.backgroundUI.onPointerClickObservable.add(() => {
			setSelectedCharacter(eid);
		});

		this.rootContainer.addControl(this.backgroundUI);

		const portraitUI = new Image("ui_portraitUI_" + eid, spriteSrc);
		portraitUI.width = 1.25;
		portraitUI.height = 2.5;
		portraitUI.top = 214;
		portraitUI.highlightColor = "";
		portraitUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		portraitUI.detectPointerOnOpaqueOnly = true;
		portraitUI.onPointerClickObservable.add(() => {
			setSelectedCharacter(eid);
		});
		this.rootContainer.addControl(portraitUI);

		const rootStackPanel = new StackPanel("ui_rootStackPanel_" + eid);
		rootStackPanel.width = 1;
		rootStackPanel.heightInPixels = 52;
		rootStackPanel.spacing = 0;
		rootStackPanel.isVertical = true;
		rootStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		rootStackPanel.onPointerClickObservable.add(() => {
			setSelectedCharacter(eid);
		});
		this.rootContainer.addControl(rootStackPanel);

		this.statusIconsUI = new Grid(`ui_playerStatusIcons_${eid}`);
		this.statusIconsUI.widthInPixels = STATUS_ICON_SLOTS * 16;
		this.statusIconsUI.heightInPixels = 32;
		this.statusIconsUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.statusIconsUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.statusIconsUI.leftInPixels = 8;
		this.statusIconsUI.topInPixels = 56;
		for (let column = 0; column < STATUS_ICON_SLOTS; column++) {
			this.statusIconsUI.addColumnDefinition(16, true);
		}
		this.statusIconsUI.addRowDefinition(16, true);
		this.statusIconsUI.addRowDefinition(16, true);
		this.rootContainer.addControl(this.statusIconsUI);

		for (let column = 0; column < STATUS_ICON_SLOTS; column++) {
			this.statusIconsUI.addControl(
				this.createStatusSlotUI(eid, column),
				0,
				column,
			);
		}

		this.queueActionBgUI = new Rectangle(`ui_playerQueueActionBg_${eid}`);
		this.queueActionBgUI.widthInPixels = 36;
		this.queueActionBgUI.heightInPixels = 36;
		this.queueActionBgUI.thickness = 1;
		this.queueActionBgUI.color = Themes.primary1;
		this.queueActionBgUI.background = Themes.primary3;
		this.queueActionBgUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.queueActionBgUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.queueActionBgUI.leftInPixels = -8;
		this.queueActionBgUI.topInPixels = 56;
		this.rootContainer.addControl(this.queueActionBgUI);

		this.queueActionUI = new Image(`ui_playerQueueAction_${eid}`);
		this.queueActionUI.width = 1;
		this.queueActionUI.height = 1;
		this.queueActionBgUI.addControl(this.queueActionUI);

		this.actBarBgUI = new Rectangle(`ui_actBarBgUI_${eid}`);
		this.actBarBgUI.width = 1;
		this.actBarBgUI.heightInPixels = 12;
		this.actBarBgUI.thickness = 0;
		this.actBarBgUI.background = Themes.primary3;
		rootStackPanel.addControl(this.actBarBgUI);

		this.actBarFillUI = this.createBarFillUI(eid, "act", Themes.secondary2);
		this.actBarBgUI.addControl(this.actBarFillUI);

		const statRowUI = new Grid(`ui_playerStatRow_${eid}`);
		statRowUI.width = 1;
		statRowUI.heightInPixels = 24;
		for (let i = 0; i < 3; i++) {
			statRowUI.addColumnDefinition(1 / 3, false);
		}
		statRowUI.addRowDefinition(24, true);
		rootStackPanel.addControl(statRowUI);

		const lifeCellUI = this.createStatCellUI(eid, "life");
		statRowUI.addControl(lifeCellUI, 0, 0);
		this.lifeValueUI = this.createStatValueUI(eid, "life", Themes.neutral2);
		lifeCellUI.addControl(this.lifeValueUI);

		const willCellUI = this.createStatCellUI(eid, "will");
		statRowUI.addControl(willCellUI, 0, 1);
		this.willValueUI = this.createStatValueUI(eid, "will", Themes.neutral2);
		willCellUI.addControl(this.willValueUI);

		const itemCellUI = this.createStatCellUI(eid, "item");
		statRowUI.addControl(itemCellUI, 0, 2);
		this.itemValueUI = this.createStatValueUI(eid, "item", Themes.neutral2);
		itemCellUI.addControl(this.itemValueUI);

		this.charNameBgUI = new Rectangle(`ui_playerCharNameBgUI_${eid}`);
		this.charNameBgUI.width = 1;
		this.charNameBgUI.heightInPixels = 16;
		this.charNameBgUI.thickness = 1;
		this.charNameBgUI.color = Themes.primary1;
		this.charNameBgUI.background = Themes.primary3;
		rootStackPanel.addControl(this.charNameBgUI);

		this.charNameUI = new TextBlock(
			`ui_playerCharNameUI_${eid}`,
			charName.toUpperCase(),
		);
		this.charNameUI.width = 1;
		this.charNameUI.height = 1;
		this.charNameUI.style = Themes.typography.bodyText;
		this.charNameUI.color = Themes.neutral2;
		this.charNameUI.topInPixels = 0;
		this.charNameUI.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.charNameUI.textVerticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		this.charNameBgUI.addControl(this.charNameUI);
	}

	public getValue(): PlayerGUIComponent {
		return this;
	}

	public dispose(): void {
		this.getRoot().dispose();
	}

	public setSelected(isSelected: boolean): void {
		this.backgroundUI.background = isSelected
			? Themes.neutral3
			: Themes.primary3;
	}

	public setActBarFill(currValue: number, maxValue: number): void {
		this.actBarFillUI.width = Math.max(
			0,
			Math.min(1, currValue / maxValue || 0),
		);
	}

	public setLifePoints(value: number): void {
		this.lifeValueUI.text = `${Math.round(value)}`;
	}

	public setWillPoints(value: number): void {
		this.willValueUI.text = `${Math.round(value)}`;
	}

	public setItemPoints(value: number): void {
		this.itemValueUI.text = `${Math.round(value)}`;
	}

	public setQueuedAction(iconSrc: string): void {
		this.queueActionUI.source = iconSrc;
	}

	public addStatusIcon(id: string, iconSrc: string): void {
		if (this.statusIcons.has(id)) {
			this.removeStatusIcon(id);
		}

		const statusIcon = new Rectangle(`ui_statusIcon_${id}`);
		statusIcon.widthInPixels = 16;
		statusIcon.heightInPixels = 16;
		statusIcon.thickness = 1;
		statusIcon.color = Themes.primary1;
		statusIcon.background = Themes.primary3;

		const statusIconImg = new Image(`ui_statusIconImg_${id}`);
		statusIconImg.width = 1;
		statusIconImg.height = 1;
		statusIconImg.source = iconSrc;
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

	private layoutStatusIcons(): void {
		let iconIndex = 0;
		for (const statusIcon of this.statusIcons.values()) {
			this.statusIconsUI.removeControl(statusIcon);
			this.statusIconsUI.addControl(
				statusIcon,
				Math.floor(iconIndex / STATUS_ICON_SLOTS),
				iconIndex % STATUS_ICON_SLOTS,
			);
			iconIndex++;
		}
	}

	private createStatusSlotUI(eid: EntityId, index: number): Rectangle {
		const slotUI = new Rectangle(`ui_statusSlot_${index}_${eid}`);
		slotUI.thickness = 1;
		slotUI.color = Themes.primary1;
		slotUI.background = Themes.primary3;
		return slotUI;
	}

	private createStatCellUI(eid: EntityId, name: string): Rectangle {
		const cellUI = new Rectangle(`ui_${name}StatCellUI_${eid}`);
		cellUI.thickness = 1;
		cellUI.color = Themes.primary1;
		cellUI.background = Themes.primary3;
		return cellUI;
	}

	private createStatValueUI(
		eid: EntityId,
		name: string,
		color: string,
	): TextBlock {
		const valueUI = new TextBlock(`ui_${name}StatValueUI_${eid}`);
		valueUI.widthInPixels = 24;
		valueUI.heightInPixels = 16;
		valueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		valueUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		valueUI.leftInPixels = -4;
		valueUI.style = Themes.typography.header4;
		valueUI.color = color;
		valueUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		valueUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		return valueUI;
	}

	private createBarFillUI(eid: EntityId, name: string, color: string) {
		const barFillUI = new Rectangle(`ui_${name}BarUIFill_${eid}`);
		barFillUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		barFillUI.width = 0.1;
		barFillUI.height = 1;
		barFillUI.color = color;
		barFillUI.background = color;
		return barFillUI;
	}

	public setTargetingCallback(newCallback: Function): void {
		this.targetingUI.onPointerClickObservable.addOnce(() => newCallback());
	}

	public removeTargetingCallback(): void {
		this.targetingUI.onPointerClickObservable.clear();
	}

	public setVisibleTargetingUI(isVisible: boolean): void {
		this.targetingUI.isVisible = isVisible;
	}
}
