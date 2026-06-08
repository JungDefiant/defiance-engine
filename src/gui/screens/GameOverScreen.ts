import {
	Button,
	Container,
	Control,
	Rectangle,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import { Themes } from "../Themes";

export class GameOverScreen {
	private rootContainer: Rectangle;

	public constructor() {
		this.rootContainer = new Rectangle("ui_gameOverGUI");
		this.rootContainer.width = "100%";
		this.rootContainer.height = "100%";
		this.rootContainer.thickness = 0;
		this.rootContainer.background = Themes.primary3;
		this.rootContainer.isVisible = false;

		const stackPanel = new StackPanel("ui_gameOverStackPanel");
		stackPanel.isVertical = true;
		stackPanel.width = "100%";
		// stackPanel.height = 240;
		stackPanel.spacing = 20;
		stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		stackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.rootContainer.addControl(stackPanel);

		const gameOverLabel = new TextBlock("ui_gameOverLabel", "GAME OVER");
		gameOverLabel.color = Themes.error;
		gameOverLabel.style = Themes.typography.header1;
		gameOverLabel.heightInPixels = 64;
		stackPanel.addControl(gameOverLabel);

		// PROTOTYPE: TO REMOVE
		const resetButton = Button.CreateSimpleButton("ui_resetButton", "Reset");
		resetButton.color = Themes.primary1;
		resetButton.background = Themes.primary3;
		resetButton.heightInPixels = 32;
		resetButton.widthInPixels = 120;
		if (resetButton.textBlock) {
			resetButton.textBlock.color = Themes.neutral2;
			resetButton.textBlock.style = Themes.typography.header3;
		}
		resetButton.onPointerClickObservable.add(() => {
			window.location.reload();
		});
		stackPanel.addControl(resetButton);
		//
	}

	public getRoot(): Container {
		return this.rootContainer;
	}

	public showHide(show: boolean) {
		this.rootContainer.isVisible = show;
	}
}
