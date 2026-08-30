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
import { getPublicRoot } from "src/modules/Utils";
import { startGame } from "src/modules/InitModule";
import { createButton } from "src/modules/UserInterfaceModule";
import AudioState from "src/states/AudioState";

export class MainMenuScreen {
	private root: AdvancedDynamicTexture;
	private audioEngine: Nullable<AudioEngineV2> = null;
	private music: Nullable<StreamingSound> = null;

	public constructor(scene: Scene) {
		const env = import.meta.env;
		this.root = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_main",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);

		const thisMainMenu = this;

		(async () => {
			thisMainMenu.audioEngine = await CreateAudioEngineAsync();
			thisMainMenu.music =
				await thisMainMenu.audioEngine.createStreamingSoundAsync(
					"mainmenu_music",
					"data/campaign_test/audio/music/voidwalker_azureglitch.mp3",
					{ loop: true, autoplay: true },
				);
		})();

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

		const newGameButtonName = "ui_newGameButton";
		const newGameButton = createButton("ui_newGameButton", {
			isCentered: true,
			text: "NEW GAME",
			sfxId: "sfx_confirm.wav",
			sfxBaseUrl: "audio/sfx",
		});
		newGameButton.color = Themes.primary1;
		newGameButton.background = Themes.primary3;
		newGameButton.widthInPixels = 200;
		newGameButton.heightInPixels = 40;

		const newGameButtonText = newGameButton.getChildByName(
			`${newGameButtonName}_text`,
		) as TextBlock;
		if (newGameButtonText) {
			newGameButtonText.color = Themes.neutral2;
			newGameButtonText.style = Themes.typography.header2;
		}
		newGameButton.onPointerClickObservable.add(async () => {
			if (thisMainMenu.music) {
				thisMainMenu.music.stop();
			}
			await startGame();
		});
		stackPanel.addControl(newGameButton);

		// TO DO: Add Load Button

		// TO DO: Add Options Button
	}
}
