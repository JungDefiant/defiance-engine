import {
	Container,
	Control,
	Rectangle,
	TextBlock,
	TextWrapping,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Nullable } from "@babylonjs/core";
import { Themes } from "./Themes";

export default class ExploreHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private highlightInfoUI: Nullable<Container> = null;

	private readonly headerUIName = "ui_highlightInfoUIHeader";
	private readonly descriptionUIName = "ui_highlightInfoUIDescription";

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_exploreHUD");

		const backgroundUI = new Rectangle("ui_exploreBgUI");
		backgroundUI.width = 1;
		backgroundUI.heightInPixels = 50;
		backgroundUI.background = Themes.primary3;
		backgroundUI.thickness = 0;
		backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.rootContainer.addControl(backgroundUI);

		this.highlightInfoUI = this.createHighlightInfoUI();
		backgroundUI.addControl(this.highlightInfoUI);

		return this.rootContainer;
	}

	public hideHighlightInfoUI() {
		this.highlightInfoUI!.alpha = 0;
	}

	public updateHighlightInfoUI(header: string, description: string) {
		if (!this.highlightInfoUI) {
			return;
		}

		this.highlightInfoUI.alpha = 1;

		const headerUI = this.highlightInfoUI.getChildByName(
			this.headerUIName,
		) as TextBlock;
		const descriptionUI = this.highlightInfoUI.getChildByName(
			this.descriptionUIName,
		) as TextBlock;

		headerUI.text = header;
		descriptionUI.text = description;
	}

	private createHighlightInfoUI(): Container {
		const highlightInfoUI = new Rectangle("ui_highlightInfoUI");
		highlightInfoUI.background = Themes.primary3;
		highlightInfoUI.color = Themes.primary1;
		highlightInfoUI.thickness = 2;
		highlightInfoUI.widthInPixels = 320;
		highlightInfoUI.heightInPixels = 50;
		highlightInfoUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

		const highlightHeader = new TextBlock(this.headerUIName, "");
		highlightHeader.fontSize = 14;
		highlightHeader.topInPixels = -10;
		highlightHeader.color = Themes.neutral2;
		highlightHeader.style = Themes.typography.header3;
		highlightInfoUI.addControl(highlightHeader);

		const highlightDescription = new TextBlock(this.descriptionUIName, "");
		highlightDescription.fontSize = 11;
		highlightDescription.lineSpacing = -8;
		highlightDescription.topInPixels = 20;
		highlightDescription.paddingLeftInPixels =
			highlightDescription.paddingRightInPixels = 8;
		highlightDescription.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		highlightDescription.textWrapping = 1;
		highlightDescription.color = Themes.neutral2;
		highlightDescription.style = Themes.typography.bodyText;
		highlightInfoUI.addControl(highlightDescription);

		highlightInfoUI.alpha = 0;

		return highlightInfoUI;
	}

	// private createAlertLevelUI() { }
}
