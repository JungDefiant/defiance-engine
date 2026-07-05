import {
	Button,
	Control,
	StackPanel,
	TextBlock,
	Container,
} from "@babylonjs/gui";
import { Themes } from "../Themes";
import { Scene } from "@babylonjs/core";
import { App } from "src/App";
import { container } from "tsyringe";
import CombatManagerSystem from "src/systems/CombatManagerSystem";

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

		const continueButton = Button.CreateSimpleButton(
			"ui_continueButton",
			"Continue",
		);
		continueButton.color = Themes.primary1;
		continueButton.background = Themes.primary3;
		continueButton.heightInPixels = 32;
		continueButton.widthInPixels = 120;
		if (continueButton.textBlock) {
			continueButton.textBlock.color = Themes.neutral2;
			continueButton.textBlock.style = Themes.typography.header4;
		}
		continueButton.onPointerClickObservable.add(() => {
			const cmSystem = container.resolve(CombatManagerSystem);
			if (cmSystem) {
				cmSystem.endCombat();
				this.showHide(false);
			}
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

// const victoryScreenUI = new StackPanel("ui_victoryScreen");
// victoryScreenUI.isVertical = true;
// victoryScreenUI.spacing = 20;
// victoryScreenUI.widthInPixels = 360;
// victoryScreenUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
// victoryScreenUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
// victoryScreenUI.top = 200;

// const victoryScreenLabel = new TextBlock("ui_victoryScreenLabel", "VICTORY");
// victoryScreenLabel.color = Themes.neutral2;
// victoryScreenLabel.style = Themes.typography.header1;
// victoryScreenLabel.outlineWidth = 2;
// victoryScreenLabel.outlineColor = Themes.primary3;
// victoryScreenLabel.heightInPixels = 64;
// victoryScreenUI.addControl(victoryScreenLabel);

// const continueButton = Button.CreateSimpleButton(
// 	"ui_continueButton",
// 	"Continue",
// );
// continueButton.color = Themes.primary1;
// continueButton.background = Themes.primary3;
// continueButton.heightInPixels = 32;
// continueButton.widthInPixels = 120;
// if (continueButton.textBlock) {
// 	continueButton.textBlock.color = Themes.neutral2;
// 	continueButton.textBlock.style = Themes.typography.header4;
// }
// continueButton.onPointerClickObservable.add(() => {
// 	const cmSystem = container.resolve(CombatManagerSystem);
// 	if (cmSystem) {
// 		cmSystem.endCombat();
// 		this.showHideVictoryScreen(false);
// 	}
// });
// victoryScreenUI.addControl(continueButton);
