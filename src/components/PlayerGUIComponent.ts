import {
	Control,
	Grid,
	Rectangle,
	Image,
	StackPanel,
	TextBlock,
	Container,
	Style,
} from "@babylonjs/gui";
import { Themes } from "../gui/Themes";
import { EntityId } from "bitecs";
import { container } from "tsyringe";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import { Component } from "src/states/registries/ComponentRegistry";
import { ActorGUI } from "./interfaces/ActorGUI";

export const COMPONENT_ID_PLAYERGUI = "PlayerGUI";

export default class PlayerGUIComponent implements ActorGUI, Component {
	private rootContainer: Container;
	private backgroundUI: Rectangle;
	private charNameBgUI: Rectangle;
	private charNameUI: TextBlock;
	private actBarBgUI: Rectangle;
	private actBarFillUI: Rectangle;
	private lifeBarBgUI: Rectangle;
	private lifeBarFillUI: Rectangle;
	private lifeBarValueUI: TextBlock;
	private willBarBgUI: Rectangle;
	private willBarFillUI: Rectangle;
	private willBarValueUI: TextBlock;
	private queueActionBgUI: Rectangle;
	private queueActionUI: Image;
	private statusIconsUI: Grid;
	private statusIcons: Map<string, Rectangle> = new Map<string, Rectangle>();

	public getRoot(): Container {
		return this.rootContainer;
	}

	public constructor(eid: EntityId, charName: string, spriteSrc: string) {
		this.rootContainer = new Container();
		this.rootContainer.widthInPixels = 200;
		this.rootContainer.heightInPixels = 200;
		this.rootContainer.top = -5;
		this.rootContainer.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_BOTTOM;

		this.backgroundUI = new Rectangle("ui_playerBgUI_" + eid);
		this.backgroundUI.width = 1;
		this.backgroundUI.heightInPixels = 128;
		this.backgroundUI.background = Themes.primary3;
		this.backgroundUI.color = Themes.primary1;
		this.backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.backgroundUI.onPointerClickObservable.add(() => {
			const uiSystem = container.resolve(UserInterfaceSystem);
			uiSystem.setSelectedCharacter(eid);
		});

		this.rootContainer.addControl(this.backgroundUI);

		const portraitUI = new Image("ui_portraitUI_" + eid, spriteSrc);
		portraitUI.width = 1.25;
		portraitUI.height = 2.5;
		portraitUI.top = 285;
		portraitUI.highlightColor = "";
		portraitUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		portraitUI.detectPointerOnOpaqueOnly = true;
		portraitUI.onPointerClickObservable.add(() => {
			const uiSystem = container.resolve(UserInterfaceSystem);
			uiSystem.setSelectedCharacter(eid);
		});
		this.rootContainer.addControl(portraitUI);

		const rootStackPanel = new StackPanel("ui_rootStackPanel_" + eid);
		rootStackPanel.width = 1;
		rootStackPanel.heightInPixels = 130;
		rootStackPanel.spacing = 8;
		rootStackPanel.isVertical = true;
		rootStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		rootStackPanel.onPointerClickObservable.add(() => {
			const uiSystem = container.resolve(UserInterfaceSystem);
			uiSystem.setSelectedCharacter(eid);
		});
		this.rootContainer.addControl(rootStackPanel);

		const iconStackPanel = new StackPanel("ui_barStackPanel_" + eid);
		iconStackPanel.heightInPixels = 50;
		iconStackPanel.isVertical = false;
		iconStackPanel.spacing = 100;
		iconStackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		iconStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		rootStackPanel.addControl(iconStackPanel);

		const barStackPanel = new StackPanel("ui_barStackPanel_" + eid);
		barStackPanel.width = 1;
		barStackPanel.isVertical = true;
		barStackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		barStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		barStackPanel.paddingTopInPixels = -4;
		rootStackPanel.addControl(barStackPanel);

		this.statusIconsUI = new Grid(`ui_playerStatusIcons_${eid}`);
		this.statusIconsUI.widthInPixels = 60;
		this.statusIconsUI.heightInPixels = 60;
		this.statusIconsUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		for (let i = 0; i < 4; i++) {
			this.statusIconsUI.addColumnDefinition(12, true);
			this.statusIconsUI.addRowDefinition(12, true);
		}
		iconStackPanel.addControl(this.statusIconsUI);

		this.queueActionBgUI = new Rectangle(`ui_playerQueueActionBg_${eid}`);
		this.queueActionBgUI.widthInPixels = 32;
		this.queueActionBgUI.heightInPixels = 32;
		this.queueActionBgUI.thickness = 1.2;
		this.queueActionBgUI.color = Themes.primary1;
		this.queueActionBgUI.background = Themes.primary3;
		this.queueActionBgUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.queueActionBgUI.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_BOTTOM;
		iconStackPanel.addControl(this.queueActionBgUI);

		this.queueActionUI = new Image(`ui_playerQueueAction_${eid}`);
		this.queueActionUI.width = 1;
		this.queueActionUI.height = 1;
		this.queueActionBgUI.addControl(this.queueActionUI);

		this.charNameBgUI = new Rectangle(`ui_${name}StatBarBgUI_${eid}`);
		this.charNameBgUI.width = 1;
		this.charNameBgUI.heightInPixels = 20;
		this.charNameBgUI.thickness = 1;
		this.charNameBgUI.color = Themes.primary1;
		this.charNameBgUI.background = Themes.primary3;
		barStackPanel.addControl(this.charNameBgUI);

		this.charNameUI = new TextBlock(
			`ui_playerQueueAction_${eid}`,
			charName.toUpperCase(),
		);
		this.charNameUI.width = 1;
		this.charNameUI.height = 1;
		this.charNameUI.style = Themes.typography.header4;
		this.charNameUI.color = Themes.neutral2;
		this.charNameUI.topInPixels = 0;
		this.charNameUI.textVerticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		this.charNameBgUI.addControl(this.charNameUI);

		// ACT BAR
		const actBgUI = this.createStatBgUI(
			eid,
			"act",
			Themes.primary1,
			Themes.primary3,
		);
		barStackPanel.addControl(actBgUI);

		const actStackUI = this.createStatPanelUI(eid);
		actBgUI.addControl(actStackUI);

		const actLabelUI = this.createLabelUI(
			eid,
			"act",
			Themes.neutral2,
			Themes.typography.bodyText,
		);
		actStackUI.addControl(actLabelUI);

		this.actBarBgUI = this.createBarBgUI(
			eid,
			"act",
			Themes.primary1,
			Themes.primary3,
		);
		actStackUI.addControl(this.actBarBgUI);

		this.actBarFillUI = this.createBarFillUI(eid, "act", Themes.secondary2);
		this.actBarBgUI.addControl(this.actBarFillUI);

		// LIFE BAR
		const lifeBgUI = this.createStatBgUI(
			eid,
			"life",
			Themes.primary1,
			Themes.primary3,
		);
		barStackPanel.addControl(lifeBgUI);

		const lifeStackUI = this.createStatPanelUI(eid);
		lifeBgUI.addControl(lifeStackUI);

		const lifeLabelUI = this.createLabelUI(
			eid,
			"life",
			Themes.neutral2,
			Themes.typography.bodyText,
		);
		lifeStackUI.addControl(lifeLabelUI);

		this.lifeBarBgUI = this.createBarBgUI(
			eid,
			"life",
			Themes.primary1,
			Themes.primary3,
		);
		lifeStackUI.addControl(this.lifeBarBgUI);

		this.lifeBarFillUI = this.createBarFillUI(
			eid,
			"life",
			Themes.secondary3,
		);
		this.lifeBarBgUI.addControl(this.lifeBarFillUI);

		this.lifeBarValueUI = this.createBarValueUI(
			eid,
			"lifeLabel",
			Themes.neutral2,
			Themes.typography.bodyText,
		);
		lifeStackUI.addControl(this.lifeBarValueUI);

		// WILL BAR
		const willBgUI = this.createStatBgUI(
			eid,
			"will",
			Themes.primary1,
			Themes.primary3,
		);
		barStackPanel.addControl(willBgUI);

		const willStackUI = this.createStatPanelUI(eid);
		willBgUI.addControl(willStackUI);

		const willLabelUI = this.createLabelUI(
			eid,
			"will",
			Themes.neutral2,
			Themes.typography.bodyText,
		);
		willStackUI.addControl(willLabelUI);

		this.willBarBgUI = this.createBarBgUI(
			eid,
			"will",
			Themes.primary1,
			Themes.primary3,
		);
		willStackUI.addControl(this.willBarBgUI);

		this.willBarFillUI = this.createBarFillUI(
			eid,
			"will",
			Themes.secondary1,
		);
		this.willBarBgUI.addControl(this.willBarFillUI);

		this.willBarValueUI = this.createBarValueUI(
			eid,
			"willLabel",
			Themes.neutral2,
			Themes.typography.bodyText,
		);
		willStackUI.addControl(this.willBarValueUI);
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

	public setLifeBarFill(currValue: number, maxValue: number): void {
		this.lifeBarFillUI.width = Math.max(
			0,
			Math.min(1, currValue / maxValue || 0),
		);
		this.lifeBarValueUI.text = `${currValue}`;
	}

	public setWillBarFill(currValue: number, maxValue: number): void {
		this.willBarFillUI.width = Math.max(
			0,
			Math.min(1, currValue / maxValue || 0),
		);
		this.willBarValueUI.text = `${currValue}`;
	}

	public setQueuedAction(iconSrc: string): void {
		this.queueActionUI.source = iconSrc;
	}

	public addStatusIcon(id: string, iconSrc: string): void {
		if (this.statusIcons.has(id)) {
			this.statusIconsUI.removeControl(
				this.statusIcons.get(id) as Rectangle,
			);
			this.statusIcons.delete(id);
		}

		const statusIcon = new Rectangle(`ui_statusIcon_${id}`);
		statusIcon.widthInPixels = 12;
		statusIcon.heightInPixels = 12;
		statusIcon.thickness = 1;
		statusIcon.color = Themes.primary1;
		statusIcon.background = Themes.primary3;
		this.statusIconsUI.addControl(statusIcon);

		const statusIconImg = new Image(`ui_statusIconImg_${id}`);
		statusIconImg.width = 1;
		statusIconImg.height = 1;
		statusIconImg.source = iconSrc;
		statusIcon.addControl(statusIconImg);

		this.statusIcons.set(id, statusIcon);
		this.statusIconsUI.addControl(statusIcon);
	}

	public removeStatusIcon(id: string): void {
		if (this.statusIcons.has(id)) {
			this.statusIconsUI.removeControl(
				this.statusIcons.get(id) as Rectangle,
			);
			this.statusIcons.delete(id);
		}
	}

	private createStatBgUI(
		eid: EntityId,
		name: string,
		color: string,
		background: string,
	): Rectangle {
		const statBgUi = new Rectangle(`ui_${name}StatBarBgUI_${eid}`);
		statBgUi.widthInPixels = 200;
		statBgUi.heightInPixels = 18;
		statBgUi.thickness = 1;
		statBgUi.color = color;
		statBgUi.background = background;
		return statBgUi;
	}

	private createStatPanelUI(eid: EntityId): StackPanel {
		const stackPanel = new StackPanel(`ui_${name}StatBarStackBgUI_${eid}`);
		stackPanel.width = 1;
		stackPanel.height = 1;
		stackPanel.spacing = 5;
		stackPanel.leftInPixels = 3;
		stackPanel.isVertical = false;

		return stackPanel;
	}

	private createLabelUI(
		eid: EntityId,
		name: string,
		color: string,
		style: Style,
	): TextBlock {
		const statLabelUi = new TextBlock(
			`ui_${name}StatLabelBgUI_${eid}`,
			name.toUpperCase(),
		);
		statLabelUi.widthInPixels = 44;
		statLabelUi.heightInPixels = 20;
		statLabelUi.style = style;
		statLabelUi.color = color;
		statLabelUi.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		statLabelUi.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		statLabelUi.paddingTopInPixels = 3;
		statLabelUi.paddingLeftInPixels = 4;
		return statLabelUi;
	}

	private createBarBgUI(
		eid: EntityId,
		name: string,
		color: string,
		background: string,
	): Rectangle {
		const bgUi = new Rectangle(`ui_${name}BarBgUI_${eid}`);
		bgUi.widthInPixels = 110;
		bgUi.heightInPixels = 12;
		bgUi.thickness = 1.2;
		bgUi.color = color;
		bgUi.background = background;
		return bgUi;
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

	private createBarValueUI(
		eid: EntityId,
		name: string,
		color: string,
		style: Style,
	) {
		const barValueUI = new TextBlock(`ui_${name}BarUIValue_${eid}`);
		barValueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		barValueUI.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		barValueUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		barValueUI.widthInPixels = 24;
		barValueUI.heightInPixels = 12;
		barValueUI.color = color;
		barValueUI.style = style;
		return barValueUI;
	}
}
