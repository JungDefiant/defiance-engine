import {
	AdvancedDynamicTexture,
	Button,
	Image,
	Control,
	Rectangle,
	StackPanel,
	TextBlock,
	TextWrapping,
} from "@babylonjs/gui";
import { CreateTypography, Themes } from "../Themes";
import { Scene, Texture } from "@babylonjs/core";
import { App } from "src/App";

export class MainMenuScreen {
	private root: AdvancedDynamicTexture;

	public constructor(scene: Scene, app: App) {
		this.root = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);

		CreateTypography(this.root);

		const backgroundImage = new Image(
			"ui_mainMenuBackgroundImage",
			`${import.meta.env.BASE_URL}/sprites/gui/gui_mainmenu.png`,
		);
		backgroundImage.width = "100%";
		backgroundImage.height = "100%";
		backgroundImage.stretch = Image.STRETCH_FILL;
		this.root.addControl(backgroundImage);

		const stackPanel = new StackPanel("ui_mainMenuStackPanel");
		stackPanel.isVertical = true;
		stackPanel.width = "50%";
		stackPanel.spacing = 20;
		stackPanel.topInPixels = 128;
		stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		stackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.root.addControl(stackPanel);

		const mainMenuTitle = new TextBlock(
			"ui_mainMenuTitle",
			"IMMORTAL REBELLION",
		);
		mainMenuTitle.color = Themes.neutral2;
		mainMenuTitle.style = Themes.typography.header1;
		mainMenuTitle.width = "100%";
		mainMenuTitle.heightInPixels = 128;
		mainMenuTitle.textWrapping = 1;
		stackPanel.addControl(mainMenuTitle);

		const newGameButton = Button.CreateSimpleButton(
			"ui_newGameButton",
			"New Game",
		);
		newGameButton.color = Themes.primary1;
		newGameButton.background = Themes.primary3;
		newGameButton.widthInPixels = 120;
		newGameButton.heightInPixels = 32;
		if (newGameButton.textBlock) {
			newGameButton.textBlock.color = Themes.neutral2;
			newGameButton.textBlock.style = Themes.typography.header3;
		}
		newGameButton.onPointerClickObservable.add(
			async () => await app.startGame(),
		);
		stackPanel.addControl(newGameButton);

		// TO DO: Add Load Button

		// TO DO: Add Options Button
	}
}
