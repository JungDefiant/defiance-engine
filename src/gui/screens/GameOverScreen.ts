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

		const mainMenuButton = Button.CreateSimpleButton(
			"ui_mainMenuButton",
			"Main Menu",
		);
		mainMenuButton.color = Themes.primary1;
		mainMenuButton.background = Themes.primary3;
		mainMenuButton.heightInPixels = 32;
		mainMenuButton.widthInPixels = 120;
		if (mainMenuButton.textBlock) {
			mainMenuButton.textBlock.color = Themes.neutral2;
			mainMenuButton.textBlock.style = Themes.typography.header4;
		}
		mainMenuButton.onPointerClickObservable.add(() => {
			window.location.reload();
		});
		stackPanel.addControl(mainMenuButton);
	}

	public getRoot(): Container {
		return this.rootContainer;
	}

	public showHide(show: boolean) {
		this.rootContainer.isVisible = show;
	}
}
