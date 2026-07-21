import {
	AdvancedDynamicTexture,
	Button,
	Image,
	Control,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import { CreateTypography, Themes } from "../Themes";
import {
	AudioEngineV2,
	CreateAudioEngineAsync,
	Nullable,
	Scene,
	StreamingSound,
	Texture,
} from "@babylonjs/core";
import { App } from "src/App";
import { getPublicRoot } from "src/helpers/Utils";

export class MainMenuScreen {
	private root: AdvancedDynamicTexture;
	private audioEngine: Nullable<AudioEngineV2> = null;
	private music: Nullable<StreamingSound> = null;

	private isLoadingMusic = false;

	public constructor(scene: Scene, app: App) {
		const env = import.meta.env;
		this.root = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);

		const thisMainMenu = this;

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
		newGameButton.onPointerClickObservable.add(async () => {
			if (thisMainMenu.music) {
				thisMainMenu.music.stop();
			}
			await app.startGame();
		});
		stackPanel.addControl(newGameButton);

		// TO DO: Add Load Button

		// TO DO: Add Options Button

		const playMusicButton = Button.CreateSimpleButton(
			"ui_newGameButton",
			"Play Music",
		);
		playMusicButton.color = Themes.primary1;
		playMusicButton.background = Themes.primary3;
		playMusicButton.widthInPixels = 200;
		playMusicButton.heightInPixels = 40;
		playMusicButton.topInPixels = -8;
		playMusicButton.leftInPixels = 8;
		playMusicButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		playMusicButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		if (playMusicButton.textBlock) {
			playMusicButton.textBlock.color = Themes.neutral2;
			playMusicButton.textBlock.style = Themes.typography.header2;
		}
		playMusicButton.onPointerClickObservable.add(async (evt, state) => {
			if (thisMainMenu.isLoadingMusic) {
				return;
			}

			thisMainMenu.isLoadingMusic = true;
			thisMainMenu.audioEngine = await CreateAudioEngineAsync();
			thisMainMenu.music =
				await thisMainMenu.audioEngine.createStreamingSoundAsync(
					"mainmenu_music",
					"data/campaign_test/audio/music/voidwalker_azureglitch.mp3",
					{ loop: true },
				);
			(await thisMainMenu.audioEngine).unlockAsync();
			(await thisMainMenu.music).play();
		});
		this.root.addControl(playMusicButton);
	}
}
