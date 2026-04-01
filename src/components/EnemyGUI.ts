import { Control, Grid, Rectangle, Image, StackPanel } from "@babylonjs/gui";
import { EntityId } from "bitecs";
import GameContext from "../GameContext";
import { Mesh } from "@babylonjs/core";
import { Themes } from "../gui/Themes";
import { ActorGUI } from "./PlayerGUI";

export class EnemyGUI implements ActorGUI {
	private rootContainer: StackPanel;
	private actBarBGUI: Rectangle;
	private actBarFillUI: Rectangle;
	private statusIconsUI: Grid;
	private statusIcons: Map<string, Rectangle> = new Map<string, Rectangle>();

	public constructor(eid: EntityId, context: GameContext, sprite: Mesh) {
		const enActorData = context.ActorDataComponent[eid];

		this.rootContainer = new StackPanel(
			`ui_enBattlerUI_${enActorData.id}_${eid}`,
		);
		this.rootContainer.widthInPixels = 100;
		this.rootContainer.heightInPixels = 80;
		context.insceneCombatGUI.addControl(this.rootContainer);

		this.statusIconsUI = new Grid(
			`ui_enBattlerStatusIcons_${enActorData.id}_${eid}`,
		);
		this.statusIconsUI.widthInPixels = 60;
		this.statusIconsUI.heightInPixels = 60;
		for (let i = 0; i < 4; i++) {
			this.statusIconsUI.addRowDefinition(12, true);
			this.statusIconsUI.addColumnDefinition(12, true);
		}
		this.rootContainer.addControl(this.statusIconsUI);

		this.actBarBGUI = new Rectangle(
			`ui_enBattlerActBarUIBG_${enActorData.id}_${eid}`,
		);
		this.actBarBGUI.widthInPixels = 100;
		this.actBarBGUI.heightInPixels = 10;
		this.actBarBGUI.thickness = 1.2;
		this.actBarBGUI.color = Themes.primary1;
		this.actBarBGUI.background = Themes.primary3;
		this.rootContainer.addControl(this.actBarBGUI);

		this.actBarFillUI = new Rectangle(
			`ui_enBattlerActBarUIFill_${enActorData.id}_${eid}`,
		);
		this.actBarFillUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.actBarFillUI.width = 0.1;
		this.actBarFillUI.height = 1;
		this.actBarFillUI.color = Themes.secondary2;
		this.actBarFillUI.background = Themes.secondary2;
		this.actBarBGUI.addControl(this.actBarFillUI);

		this.rootContainer.linkWithMesh(sprite);
		this.rootContainer.linkOffsetY = 30;
	}

	public setActBarFill(currValue: number, maxValue: number): void {
		this.actBarFillUI.width = currValue / maxValue;
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
}
