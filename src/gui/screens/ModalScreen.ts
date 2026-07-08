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
import { getPublicRoot } from "src/Utils";

export class ModalScreen {
	private rootContainer: Rectangle;
	private modalLabel: TextBlock;
	private modalText: TextBlock;
	private modalImage: Image;
	private pageCount: TextBlock;
	private currentPageIndex: number;
	private modalPages: ModalPage[] = [];
	private navButtons: Button[] = [];

	public constructor() {
		this.rootContainer = new Rectangle("ui_modalGUI");
		this.rootContainer.widthInPixels = 600;
		this.rootContainer.adaptHeightToChildren = true;
		this.rootContainer.thickness = 1;
		this.rootContainer.color = Themes.primary1;
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

		const thisScreen = this;

		const lastPageButton = Button.CreateImageOnlyButton(
			"ui_lastPageButton",
			`${getPublicRoot()}/sprites/gui/icons/icon_lastpage.png`,
		);
		lastPageButton.color = Themes.primary1;
		lastPageButton.background = Themes.primary3;
		lastPageButton.heightInPixels = 32;
		lastPageButton.widthInPixels = 32;
		lastPageButton.onPointerClickObservable.add(() => {
			thisScreen.renderPageByIndex(thisScreen.currentPageIndex - 1);
		});
		buttonPanel.addControl(lastPageButton);
		this.navButtons[0] = lastPageButton;

		const nextPageButton = Button.CreateImageOnlyButton(
			"ui_nextPageButton",
			`${getPublicRoot()}/sprites/gui/icons/icon_nextpage.png`,
		);
		nextPageButton.color = Themes.primary1;
		nextPageButton.background = Themes.primary3;
		nextPageButton.heightInPixels = 32;
		nextPageButton.widthInPixels = 32;
		nextPageButton.onPointerClickObservable.add(() => {
			thisScreen.renderPageByIndex(thisScreen.currentPageIndex + 1);

		});
		buttonPanel.addControl(nextPageButton);
		this.navButtons[1] = nextPageButton;

		const exitButton = Button.CreateImageOnlyButton("ui_exitButton", `${getPublicRoot()}/sprites/gui/icons/icon_exit.png`);
		exitButton.color = Themes.primary1;
		exitButton.background = Themes.primary3;
		exitButton.heightInPixels = 32;
		exitButton.widthInPixels = 32;
		exitButton.onPointerClickObservable.add(() => {
			thisScreen.showHide(false);
		});
		buttonPanel.addControl(exitButton);
		this.navButtons[2] = exitButton;

		this.pageCount = new TextBlock("ui_modalPageCount", "");
		this.pageCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.pageCount.style = Themes.typography.header3;
		this.pageCount.widthInPixels = 32;
		this.pageCount.heightInPixels = 32;
		buttonPanel.addControl(this.pageCount);

		this.currentPageIndex = 0;
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
		if(index < 0) {
			index = this.modalPages.length - 1;
		}
		else if (index > this.modalPages.length - 1) {
			index = 0;
		}

		this.currentPageIndex = index;
		const currentPage = this.modalPages[index];

		this.modalLabel.text = currentPage.title;
    	this.modalText.text = currentPage.textBody;
		if (currentPage.imageSrc) {
			this.modalImage.source = currentPage.imageSrc;
			this.modalImage.isVisible = true;
		} else {
			this.modalImage.isVisible = false;
		}

		if(this.modalPages.length > 1) {
			this.pageCount.text = `${index + 1} / ${this.modalPages.length}`;
			this.pageCount.isVisible = true;
		}
		else {
			this.pageCount.isVisible = false;
		}


		this.navButtons.forEach((button) => button.isVisible = false);

		if(index > 0 && this.modalPages.length > 1) {
			// Enables last page button
			this.navButtons[0].isVisible = true;
		}

		if(index < this.modalPages.length - 1 && this.modalPages.length > 1) {
			// Enables next page button
			this.navButtons[1].isVisible = true;
		}

		if(index === this.modalPages.length - 1) {
			// Enables exit button
			this.navButtons[2].isVisible = true;
		}

	}
}

export interface ModalPage {
	title: string;
	textBody: string;
	imageSrc?: string;
}
