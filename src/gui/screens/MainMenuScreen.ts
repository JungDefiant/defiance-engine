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
import { getPublicRoot } from "src/helpers/Utils";

export class MainMenuScreen {
	private root: AdvancedDynamicTexture;

	public constructor(scene: Scene, app: App) {
		const env = import.meta.env;
		this.root = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);

		CreateTypography(this.root);

		document.fonts.ready.then(() => {
			this.root.markAsDirty();
		});

		const backgroundImage = new Image(
			"ui_mainMenuBackgroundImage",
			`${getPublicRoot()}/sprites/gui/gui_mainmenu.png`,
		);
		backgroundImage.width = "100%";
		backgroundImage.height = "100%";
		backgroundImage.stretch = Image.STRETCH_FILL;
		this.root.addControl(backgroundImage);

		const stackPanel = new StackPanel("ui_mainMenuStackPanel");
		stackPanel.isVertical = true;
		stackPanel.width = "50%";
		stackPanel.spacing = 20;
		stackPanel.topInPixels = 120;
		stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		stackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.root.addControl(stackPanel);

		const mainMenuTitle = new TextBlock(
			"ui_mainMenuTitle",
			"IMMORTAL REBELLION",
		);
		mainMenuTitle.color = Themes.neutral2;
		mainMenuTitle.style = Themes.typography.title;
		mainMenuTitle.width = "100%";
		mainMenuTitle.heightInPixels = 160;
		mainMenuTitle.textWrapping = 1;
		stackPanel.addControl(mainMenuTitle);

		const newGameButton = Button.CreateSimpleButton(
			"ui_newGameButton",
			"NEW GAME",
		);
		newGameButton.color = Themes.primary1;
		newGameButton.background = Themes.primary3;
		newGameButton.widthInPixels = 200;
		newGameButton.heightInPixels = 40;
		if (newGameButton.textBlock) {
			newGameButton.textBlock.color = Themes.neutral2;
			newGameButton.textBlock.style = Themes.typography.header2;
		}
		newGameButton.onPointerClickObservable.add(
			async () => await app.startGame(),
		);
		stackPanel.addControl(newGameButton);

		// TO DO: Add Load Button

		// TO DO: Add Options Button
	}
}
