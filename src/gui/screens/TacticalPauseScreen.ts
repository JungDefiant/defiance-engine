import {
	Button,
	Container,
	Control,
	Rectangle,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import { Themes } from "../Themes";

export class TacticalPauseScreen {
	private rootContainer: Rectangle;

	public constructor() {
		this.rootContainer = new Rectangle("ui_tacticalPauseGUI");
		this.rootContainer.width = "100%";
		this.rootContainer.height = "100%";
		this.rootContainer.thickness = 0;
		this.rootContainer.background = `${Themes.primary3}${Themes.tacticalPauseOpacity}`;
		this.rootContainer.zIndex = -100;
		this.rootContainer.isVisible = false;

		const tacticalPauseLabel = new TextBlock(
			"ui_tacticalPauseLabel",
			"TACTICAL PAUSE",
		);
		tacticalPauseLabel.color = Themes.error;
		tacticalPauseLabel.style = Themes.typography.header1;
		tacticalPauseLabel.heightInPixels = 64;
		tacticalPauseLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		tacticalPauseLabel.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		tacticalPauseLabel.topInPixels = 16;
		this.rootContainer.addControl(tacticalPauseLabel);
	}

	public getRoot(): Container {
		return this.rootContainer;
	}

	public showHide(show: boolean) {
		this.rootContainer.isVisible = show;
	}
}
