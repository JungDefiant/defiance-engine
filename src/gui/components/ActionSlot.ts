import {
	Control,
	Image,
	Rectangle,
	TextBlock,
} from "@babylonjs/gui";
import { Themes } from "../Themes";

export class ActionSlot {
	public readonly rootContainer: Rectangle;

	private actionIcon: Image;

	public constructor(label: string, iconSrc: string) {
		this.rootContainer = new Rectangle("ui_actionSlot_" + label);
		this.rootContainer.color = Themes.primary1;
		this.rootContainer.background = Themes.primary3;
		this.rootContainer.thickness = 2;
		this.rootContainer.widthInPixels = 32;
		this.rootContainer.heightInPixels = 32;

		this.actionIcon = new Image("ui_actionSlotIcon");
		this.actionIcon.source = iconSrc;
		this.actionIcon.width = 1;
		this.actionIcon.height = 1;
		this.rootContainer.addControl(this.actionIcon);

		const actionSlotLabel = new TextBlock("ui_actionSlotLabel", "Ability");
		actionSlotLabel.color = Themes.neutral2;
		actionSlotLabel.style = Themes.typography.bodyText;
		actionSlotLabel.widthInPixels = 12;
		actionSlotLabel.heightInPixels = 12;
		actionSlotLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		actionSlotLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
	}

	public setActionSlotIcon(iconSrc: string) {
		this.actionIcon.source = iconSrc;
	}
}
