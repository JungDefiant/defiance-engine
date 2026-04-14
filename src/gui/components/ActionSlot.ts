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

		this.actionIcon = new Image("ui_actionSlotIcon");
		this.actionIcon.source = iconSrc;
		this.actionIcon.width = 1;
		this.actionIcon.height = 1;
		this.actionIcon.onPointerClickObservable.add(() => onClickEvent());
		this.rootContainer.addControl(this.actionIcon);

		this.actionLabel = new TextBlock("ui_actionSlotLabel", "Q");
		this.actionLabel.color = Themes.neutral2;
		this.actionLabel.style = Themes.typography.caption;
		this.actionLabel.widthInPixels = 16;
		this.actionLabel.heightInPixels = 16;
		this.actionLabel.topInPixels = -8;
		this.actionLabel.leftInPixels = -3;
		this.actionLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.actionLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.rootContainer.addControl(this.actionLabel);
	}

	public setActionSlotIcon(iconSrc: string) {
		this.actionIcon.source = iconSrc;
	}

	public setActionLabelText(label: string) {
		this.actionLabel.text = label;
	}

	public setOnClickEvent(evt: Function) {
		this.actionIcon.onPointerClickObservable.clear();
		this.actionIcon.onPointerClickObservable.add(() => evt());
	}
}
