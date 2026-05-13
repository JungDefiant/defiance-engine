import {
	Control,
	Grid,
	Rectangle,
	Image,
	StackPanel,
	TextBlock,
	Style,
} from "@babylonjs/gui";
import { EntityId } from "bitecs";
import GameContext from "../GameContext";
import { Mesh } from "@babylonjs/core";
import { Themes } from "../gui/Themes";
import { ActorGUI } from "./PlayerGUI";

export class EnemyGUI implements ActorGUI {
	private rootContainer: StackPanel;
	private targetingUI: Image;
	private actBarBGUI: Rectangle;
	private actBarFillUI: Rectangle;
	private lifeBarBGUI: Rectangle;
	private lifeBarFillUI: Rectangle;
	private lifeBarValueUI: TextBlock;
	private statusIconsUI: Grid;
	private statusIcons: Map<string, Rectangle> = new Map<string, Rectangle>();

	public constructor(eid: EntityId, context: GameContext, sprite: Mesh) {
		const enActorData = context.ActorDataComponent[eid];

		this.rootContainer = new StackPanel(
			`ui_enBattlerUI_${enActorData.id}_${eid}`,
		);
		this.rootContainer.widthInPixels = 120;
		this.rootContainer.heightInPixels = 240;
		context.insceneCombatGUI.addControl(this.rootContainer);

		this.targetingUI = new Image(
			`ui_enBattlerTargetings_${eid}`,
			"sprites/particles/magic_03.png",
		);
		this.targetingUI.widthInPixels = 96;
		this.targetingUI.heightInPixels = 96;
		this.targetingUI.shadowOffsetX = 1;
		this.targetingUI.shadowOffsetY = 1;
		this.targetingUI.onPointerEnterObservable.add(() => {
			this.targetingUI.shadowColor = "red";
		});
		this.targetingUI.onPointerOutObservable.add(() => {
			this.targetingUI.shadowColor = "#00000000";
		});
		this.targetingUI.onPointerClickObservable.add(() => {});
		this.targetingUI.isVisible = false;
		this.rootContainer.addControl(this.targetingUI);

		this.statusIconsUI = new Grid(`ui_enBattlerStatusIcons_${eid}`);
		this.statusIconsUI.widthInPixels = 120;
		this.statusIconsUI.heightInPixels = 24;
		for (let i = 0; i < 2; i++) {
			this.statusIconsUI.addRowDefinition(12, true);
		}
		for (let i = 0; i < 8; i++) {
			this.statusIconsUI.addColumnDefinition(12, true);
		}
		this.rootContainer.addControl(this.statusIconsUI);

		this.actBarBGUI = this.createBarBgUI(
			eid,
			"enBattlerActBarUIBG",
			Themes.primary1,
			Themes.primary3,
		);
		this.rootContainer.addControl(this.actBarBGUI);

		this.actBarFillUI = this.createBarFillUI(
			eid,
			"enBattlerActBarUIFill_",
			Themes.secondary2,
		);
		this.actBarBGUI.addControl(this.actBarFillUI);

		this.lifeBarBGUI = this.createBarBgUI(
			eid,
			"enBattlerActBarUIBG",
			Themes.primary1,
			Themes.primary3,
		);
		this.rootContainer.addControl(this.lifeBarBGUI);

		this.lifeBarFillUI = this.createBarFillUI(
			eid,
			"enBattlerActBarUIFill_",
			Themes.secondary3,
		);
		this.lifeBarBGUI.addControl(this.lifeBarFillUI);

		this.lifeBarValueUI = this.createBarValueUI(
			eid,
			"lifeLabel",
			Themes.neutral2,
			Themes.typography.caption,
		);
		this.lifeBarBGUI.addControl(this.lifeBarValueUI);

		this.rootContainer.linkWithMesh(sprite);
		this.rootContainer.linkOffsetY = 40;
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
			Math.min(1, currValue / maxValue || 0) * 0.65,
		);

		const perc = Math.round((currValue / maxValue) * 100 || 0);
		this.lifeBarValueUI.text = `${perc}%`;
	}

	public addStatusIcon(id: string, iconSrc: string): void {
		if (this.statusIcons.has(id)) {
			this.statusIconsUI.removeControl(this.statusIcons.get(id) as Rectangle);
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
			this.statusIconsUI.removeControl(this.statusIcons.get(id) as Rectangle);
			this.statusIcons.delete(id);
		}
	}

	public setTargetingCallback(newCallback: Function): void {
		this.targetingUI.onPointerClickObservable.addOnce(() => newCallback());
	}

	public setVisibleTargetingUI(isVisible: boolean): void {
		this.targetingUI.isVisible = isVisible;
	}

	private createBarBgUI(
		eid: EntityId,
		name: string,
		color: string,
		background: string,
	): Rectangle {
		const barBGUI = new Rectangle(`ui_${name}_${eid}`);
		barBGUI.widthInPixels = 100;
		barBGUI.heightInPixels = 12;
		barBGUI.thickness = 1.2;
		barBGUI.color = color;
		barBGUI.background = background;
		return barBGUI;
	}

	private createBarFillUI(
		eid: EntityId,
		name: string,
		color: string,
	): Rectangle {
		const barFillUI = new Rectangle(`ui_${name}_${eid}`);
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
		barValueUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		barValueUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		barValueUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		barValueUI.widthInPixels = 30;
		barValueUI.heightInPixels = 14;
		barValueUI.topInPixels = 2;
		barValueUI.color = color;
		barValueUI.style = style;
		return barValueUI;
	}
}
