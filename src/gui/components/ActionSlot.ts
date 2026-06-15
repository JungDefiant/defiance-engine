import { Control, Image, Rectangle, TextBlock } from "@babylonjs/gui";
import { Themes } from "../Themes";

export class ActionSlot {
	public readonly rootContainer: Rectangle;

	private actionIcon: Image;
	private actionLabel: TextBlock;

	public constructor(label: string, iconSrc: string, onClickEvent: Function) {
		this.rootContainer = new Rectangle("ui_actionSlot_" + label);
		this.rootContainer.color = Themes.primary1;
		this.rootContainer.background = Themes.primary3;
		this.rootContainer.thickness = 2;
		this.rootContainer.widthInPixels = 32;
		this.rootContainer.heightInPixels = 32;
		this.rootContainer.onPointerClickObservable.add(() => onClickEvent());

		this.actionIcon = new Image("ui_actionSlotIcon");
		this.actionIcon.source = iconSrc;
		this.actionIcon.width = 1;
		this.rootContainer.addControl(this.actionIcon);

		this.actionLabel = new TextBlock("ui_actionSlotLabel", "");
		this.actionLabel.color = Themes.neutral1;
		this.actionLabel.style = Themes.typography.header3;
		this.actionLabel.outlineWidth = 2;
		this.actionLabel.outlineColor = Themes.primary3;
		this.actionLabel.widthInPixels = 24;
		this.actionLabel.heightInPixels = 24;
		this.actionLabel.topInPixels = -4;
		this.actionLabel.leftInPixels = -1;
		this.actionLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.actionLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.actionLabel.isPointerBlocker = false;
		this.rootContainer.addControl(this.actionLabel);
	}

	public setActionSlotIcon(iconSrc: string) {
		this.actionIcon.source = iconSrc;
	}

	public setActionLabelText(label: string) {
		this.actionLabel.text = label;
	}

	public setOnClickEvent(evt: Function) {
		this.rootContainer.onPointerClickObservable.clear();
		this.rootContainer.onPointerClickObservable.add(() => evt());
	}
}
