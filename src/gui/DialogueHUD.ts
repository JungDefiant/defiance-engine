import { Nullable } from "@babylonjs/core";
import {
	Container,
	AdvancedDynamicTexture,
	Rectangle,
	Control,
	Image,
	TextBlock,
	StackPanel,
	ScrollViewer,
	Grid,
	TextWrapping,
	ScrollBar,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import { DialogueLineData } from "../systems/DialogueManagerSystem";

export default class DialogueHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private dialogueFeedUI: Nullable<Container> = null;
	private textEntryStack: Nullable<StackPanel> = null;
	private textEntryScrollbar: Nullable<ScrollBar> = null;
	private optionsEntryGrid: Nullable<Grid> = null;
	private speakerPortraitUI: Nullable<Container> = null;

	private readonly speakerPortraitName = "ui_speakerPortrait";
	private readonly optionEntryStackName = "ui_optionsEntryStack";

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show ? true : false;
	}

	public createHUD(fullscreen: AdvancedDynamicTexture): void {
		this.rootContainer = new Container("ui_dialogueHUD");

		this.dialogueFeedUI = this.createDialogueFeed();
		this.rootContainer.addControl(this.dialogueFeedUI);

		this.speakerPortraitUI = this.createSpeakerPortrait();
		this.rootContainer.addControl(this.speakerPortraitUI);

		fullscreen.addControl(this.rootContainer);

		// this.testDialogue();
	}

	private testDialogue() {
		// Test
		const diagData = {
			speaker: "Some Guy",
			speakerColor: "#FF0000",
			speakerPortraitSrc: "https://placehold.co/180x200",
			line: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque ut velit placerat, convallis quam vel, varius elit. Fusce dapibus interdum felis, quis gravida ante malesuada id. Sed vel posuere quam.",
		} as DialogueLineData;

		this.addTextDialogueEntry(diagData, 0);
		this.addTextDialogueEntry(diagData, 1);
		this.addTextDialogueEntry(diagData, 2);
		this.addTextDialogueEntry(diagData, 3);
		this.addTextDialogueEntry(diagData, 4);
		this.addTextDialogueEntry(diagData, 4);
		this.addTextDialogueEntry(diagData, 4);
		// this.addTextDialogueEntry(diagData, 4);
		// this.addTextDialogueEntry(diagData, 4);
		// this.addTextDialogueEntry(diagData, 4);
		// this.addTextDialogueEntry(diagData, 4);
		// this.addTextDialogueEntry(diagData, 4);
		// this.addTextDialogueEntry(diagData, 4);
	}

	public showHideScrollbar(show: boolean): void {
		this.textEntryScrollbar!.alpha = show ? 1 : 0;
		this.textEntryScrollbar!.isEnabled = show ? true : false;
	}

	public addTextDialogueEntry(entryData: DialogueLineData, index: number) {
		const entryRoot = new StackPanel("ui_dialogueNode_" + index);
		entryRoot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		entryRoot.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		entryRoot.width = 1.0;
		entryRoot.heightInPixels = 65;
		entryRoot.isVertical = true;

		if (entryData.speaker) {
			this.speakerPortraitUI!.alpha = 1;
			const speakerPortrait = this.speakerPortraitUI!.getChildByName(
				this.speakerPortraitName,
			) as Image;
			speakerPortrait.source = "https://placehold.co/180x200";

			const speakerLabel = new TextBlock(
				"ui_speaker_" + index,
				entryData.speaker + "_" + index,
			);
			speakerLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
			speakerLabel.color = entryData.speakerColor;
			speakerLabel.heightInPixels = 20;
			entryRoot.addControl(speakerLabel);
		} else {
			this.speakerPortraitUI!.alpha = 0;
		}

		const lineUI = new TextBlock("ui_line_" + index, entryData.line);
		lineUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		lineUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		lineUI.color = "white";
		lineUI.resizeToFit = true;
		lineUI.textWrapping = TextWrapping.WordWrap;
		entryRoot.addControl(lineUI);

		this.textEntryStack!.addControl(entryRoot);
	}

	public createDialogueFeed(): Container {
		const dialogueFeedUI = new Rectangle("ui_dialogueFeed");
		dialogueFeedUI.isPointerBlocker = true;
		dialogueFeedUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		dialogueFeedUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		dialogueFeedUI.background = "black";
		dialogueFeedUI.alpha = 0.45;
		dialogueFeedUI.thickness = 0;
		dialogueFeedUI.widthInPixels = 320;
		dialogueFeedUI.heightInPixels = 540;

		const textEntryArea = new Container("ui_textEntryScroll");
		textEntryArea.isPointerBlocker = true;
		textEntryArea.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		textEntryArea.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		textEntryArea.widthInPixels = 285;
		textEntryArea.heightInPixels = 325;
		textEntryArea.background = "black";
		textEntryArea.alpha = 0.6;
		dialogueFeedUI.addControl(textEntryArea);

		const sizePerEntry = 81;

		this.textEntryStack = new StackPanel("ui_textEntryStack");
		this.textEntryStack.isPointerBlocker = true;
		this.textEntryStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.textEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.textEntryStack.width = 1;
		this.textEntryStack.spacing = 16;
		this.textEntryStack.paddingLeft = 6;
		this.textEntryStack.paddingRight = 6;
		this.textEntryStack.paddingBottom = 6;
		this.textEntryStack.adaptHeightToChildren = true;
		this.textEntryStack.onControlAddedObservable.add(() => {
			const textEntryStackSize =
				this.textEntryStack!.children.length * sizePerEntry;
			if (textEntryStackSize < textEntryArea.heightInPixels) {
				this.showHideScrollbar(false);
			} else {
				this.showHideScrollbar(true);
				this.textEntryScrollbar!.thumbWidth =
					100 * (textEntryArea.heightInPixels / textEntryStackSize);
			}
		});
		textEntryArea.addControl(this.textEntryStack);

		this.textEntryScrollbar = new ScrollBar("ui_textEntryScrollbar");
		this.textEntryScrollbar.isPointerBlocker = true;
		this.textEntryScrollbar.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.textEntryScrollbar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.textEntryScrollbar.isVertical = true;
		this.textEntryScrollbar.isThumbClamped = true;
		this.textEntryScrollbar.widthInPixels = 8;
		this.textEntryScrollbar.onValueChangedObservable.add((value) => {
			const textEntryStackSize =
				(this.textEntryStack!.children.length - 4) * sizePerEntry;
			this.textEntryStack!.topInPixels = (value / 100) * textEntryStackSize;
		});
		this.textEntryScrollbar.value = 0;
		this.showHideScrollbar(false);
		textEntryArea.addControl(this.textEntryScrollbar);

		const optionsEntryStack = new StackPanel(this.optionEntryStackName);
		optionsEntryStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		optionsEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

		return dialogueFeedUI;
	}

	public createSpeakerPortrait(): Container {
		const portraitRoot = new Rectangle("ui_portraitRoot");
		portraitRoot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		portraitRoot.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		portraitRoot.widthInPixels = 166;
		portraitRoot.heightInPixels = 206;
		portraitRoot.leftInPixels = 336;
		portraitRoot.topInPixels = 120;
		portraitRoot.thickness = 3;
		portraitRoot.color = "black";

		const speakerPortrait = new Image(
			this.speakerPortraitName,
			"https://placehold.co/160x200",
		);

		speakerPortrait.widthInPixels = 160;
		speakerPortrait.heightInPixels = 200;
		portraitRoot.addControl(speakerPortrait);

		return portraitRoot;
	}
}
