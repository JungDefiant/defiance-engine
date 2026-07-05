import {
	Button,
	Container,
	Control,
	Image,
	Rectangle,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import { Themes } from "../Themes";

export class ModalScreen {
	private rootContainer: Rectangle;
	private modalLabel: TextBlock;
	private modalText: TextBlock;
	private modalImage: Image;
	private currentPage: ModalPage = { title: "", textBody: "", imageSrc: "" };
	private modalPages: ModalPage[] = [];
	private navButtons: Button[] = [];

	public constructor() {
		this.rootContainer = new Rectangle("ui_modalGUI");
		this.rootContainer.widthInPixels = 0;
		this.rootContainer.adaptHeightToChildren = true;
		this.rootContainer.thickness = 0;
		this.rootContainer.background = Themes.primary3;
		this.rootContainer.isVisible = false;

		const stackPanel = new StackPanel("ui_modalStackPanel");
		stackPanel.isVertical = true;
		stackPanel.width = 1;
		stackPanel.adaptHeightToChildren = true;
		stackPanel.spacing = 20;
		stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		stackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.rootContainer.addControl(stackPanel);

		this.modalLabel = new TextBlock("ui_modalLabel", "");
		this.modalLabel.color = Themes.neutral1;
		this.modalLabel.style = Themes.typography.header1;
		this.modalLabel.heightInPixels = 64;
		stackPanel.addControl(this.modalLabel);

		const textBodyPanel = new StackPanel("ui_textBodyPanel");
		textBodyPanel.isVertical = false;
		textBodyPanel.width = 1;
		textBodyPanel.adaptHeightToChildren = true;
		textBodyPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		textBodyPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		stackPanel.addControl(textBodyPanel);

		this.modalText = new TextBlock("ui_modalLabel", "");
		this.modalText.color = Themes.neutral1;
		this.modalText.style = Themes.typography.bodyText;
		this.modalText.heightInPixels = 0;
		textBodyPanel.addControl(this.modalText);

		this.modalImage = new Image("ui_modalImage", "");
		this.modalImage.widthInPixels = 0;
		this.modalImage.heightInPixels = 0;
		textBodyPanel.addControl(this.modalImage);

		const buttonPanel = new StackPanel("ui_buttonStackPanel");
		buttonPanel.isVertical = false;
		buttonPanel.width = 1;
		buttonPanel.adaptHeightToChildren = true;
		buttonPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		buttonPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		stackPanel.addControl(buttonPanel);

		const nextPageButton = Button.CreateImageOnlyButton(
			"ui_nextPageButton",
			"src/",
		);
		nextPageButton.color = Themes.primary1;
		nextPageButton.background = Themes.primary3;
		nextPageButton.heightInPixels = 32;
		nextPageButton.widthInPixels = 32;
		nextPageButton.onPointerClickObservable.add(() => {
			// Switch to next page
		});
		buttonPanel.addControl(nextPageButton);
		this.navButtons[0] = nextPageButton;

		const lastPageButton = Button.CreateImageOnlyButton(
			"ui_lastPageButton",
			"src/",
		);
		lastPageButton.color = Themes.primary1;
		lastPageButton.background = Themes.primary3;
		lastPageButton.heightInPixels = 32;
		lastPageButton.widthInPixels = 32;
		lastPageButton.onPointerClickObservable.add(() => {
			// Switch to last page
		});
		buttonPanel.addControl(lastPageButton);
		this.navButtons[1] = lastPageButton;

		const exitButton = Button.CreateImageOnlyButton("ui_exitButton", "src/");
		exitButton.color = Themes.primary1;
		exitButton.background = Themes.primary3;
		exitButton.heightInPixels = 32;
		exitButton.widthInPixels = 32;
		exitButton.onPointerClickObservable.add(() => {
			// Close modal
		});
		buttonPanel.addControl(exitButton);
		this.navButtons[2] = exitButton;
	}

	public getRoot(): Container {
		return this.rootContainer;
	}

	public showHide(show: boolean) {
		this.rootContainer.isVisible = show;
	}

	public setNewPages(pages: ModalPage[]) {
		this.modalPages = pages;
		this.renderPageByIndex(0);
	}

	public renderPageByIndex(index: number) {
		// Check for out of bounds and early exit

		this.currentPage = this.modalPages[0];

		this.modalLabel.text = this.currentPage.title;
		if (this.currentPage.imageSrc) {
			this.modalImage.source = this.currentPage.imageSrc;
			this.modalImage.isVisible = true;
		} else {
			this.modalImage.isVisible = false;
		}
    this.modalText.text = this.currentPage.textBody;
    
    
	}
}

export interface ModalPage {
	title: string;
	textBody: string;
	imageSrc?: string;
}
