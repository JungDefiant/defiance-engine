import {
	Button,
	Control,
	StackPanel,
	TextBlock,
	Container,
} from "@babylonjs/gui";
import { Themes } from "../Themes";
import { endCombat } from "src/modules/CombatModule";
import { createButton } from "src/modules/UserInterfaceModule";

export class VictoryScreen {
	private rootContainer: StackPanel;

	public constructor() {
		this.rootContainer = new StackPanel("ui_victoryScreen");
		this.rootContainer.isVertical = true;
		this.rootContainer.spacing = 20;
		this.rootContainer.widthInPixels = 360;
		this.rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.rootContainer.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.rootContainer.top = 200;
		this.rootContainer.zIndex = 1000;

		const victoryScreenLabel = new TextBlock(
			"ui_victoryScreenLabel",
			"VICTORY",
		);
		victoryScreenLabel.color = Themes.neutral2;
		victoryScreenLabel.style = Themes.typography.header1;
		victoryScreenLabel.outlineWidth = 2;
		victoryScreenLabel.outlineColor = Themes.primary3;
		victoryScreenLabel.heightInPixels = 64;
		this.rootContainer.addControl(victoryScreenLabel);

		const continueGameButtonName = "ui_continueButton";
		const continueButton = createButton(continueGameButtonName, {
			isCentered: true,
			text: "Continue",
			sfxId: "sfx_confirm.wav",
			sfxBaseUrl: "audio/sfx",
		});
		continueButton.color = Themes.primary1;
		continueButton.background = Themes.primary3;
		continueButton.heightInPixels = 32;
		continueButton.widthInPixels = 120;

		const continueGameButtonText = continueButton.getChildByName(
			`${continueGameButtonName}_text`,
		) as TextBlock;
		if (continueGameButtonText) {
			continueGameButtonText.color = Themes.neutral2;
			continueGameButtonText.style = Themes.typography.header4;
		}
		continueButton.onPointerClickObservable.add(() => {
			endCombat();
			this.showHide(false);
		});
		this.rootContainer.addControl(continueButton);
	}

	public getRoot(): Container {
		return this.rootContainer;
	}

	public showHide(show: boolean) {
		this.rootContainer.isVisible = show;
	}
}
