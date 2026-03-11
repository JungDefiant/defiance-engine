import {
	AdvancedDynamicTexture,
	Container,
	Control,
	Rectangle,
	TextBlock,
	TextWrapping,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Nullable } from "@babylonjs/core";

export default class ExploreHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private highlightInfoUI: Nullable<Container> = null;
	private alertLevelUI: Nullable<Container> = null;

	private readonly headerUIName = "ui_highlightInfoUIHeader";
	private readonly descriptionUIName = "ui_highlightInfoUIDescription";

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show ? true : false;
	}

	public createHUD(fullScreenUI: AdvancedDynamicTexture) {
		this.rootContainer = new Container("ui_exploreHUD");

		this.highlightInfoUI = this.createHighlightInfoUI();
		this.rootContainer.addControl(this.highlightInfoUI);

		fullScreenUI.addControl(this.rootContainer);
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
		highlightInfoUI.background = "gray";
		highlightInfoUI.color = "black";
		highlightInfoUI.widthInPixels = 320;
		highlightInfoUI.heightInPixels = 50;
		highlightInfoUI.topInPixels = 274;

		const highlightHeader = new TextBlock(this.headerUIName, "Header");
		highlightHeader.fontSize = 14;
		highlightHeader.topInPixels = -10;
		highlightInfoUI.addControl(highlightHeader);

		const highlightDescription = new TextBlock(
			this.descriptionUIName,
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ex odio, ultricies quis lorem vitae, blandit convallis.",
		);
		highlightDescription.fontSize = 11;
		highlightDescription.lineSpacing = -8;
		highlightDescription.topInPixels = 20;
		highlightDescription.paddingLeftInPixels =
			highlightDescription.paddingRightInPixels = 8;
		highlightDescription.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		highlightDescription.textWrapping = TextWrapping.WordWrap;
		highlightInfoUI.addControl(highlightDescription);

		highlightInfoUI.alpha = 0;

		return highlightInfoUI;
	}

	// private createAlertLevelUI() { }
}
