import { Nullable } from "@babylonjs/core";
import {
	Container,
	Rectangle,
	Control,
	Image,
	TextBlock,
	StackPanel,
	TextWrapping,
	ScrollBar,
	Button,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import DialogueManagerSystem, {
	CharacterData,
	DialogueChoiceData,
	DialogueData,
	DialogueNodeData,
} from "../systems/DialogueManagerSystem";
import { container } from "tsyringe";
import { Themes } from "./Themes";

export default class DialogueHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private dialogueFeedUI: Nullable<Container> = null;
	private textEntryStack: Nullable<StackPanel> = null;
	private textEntryScrollbar: Nullable<ScrollBar> = null;
	private optionsEntryStack: Nullable<StackPanel> = null;
	private characterPortraitUI: Nullable<Container> = null;

	private readonly optionEntryStackName = "ui_optionsEntryStack";

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_dialogueHUD");

		const backgroundUI = new Rectangle("ui_exploreBgUI");
		backgroundUI.width = 1;
		backgroundUI.heightInPixels = 50;
		backgroundUI.background = Themes.primary3;
		backgroundUI.thickness = 0;
		backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.rootContainer.addControl(backgroundUI);

		this.dialogueFeedUI = this.createDialogueFeed();
		this.rootContainer.addControl(this.dialogueFeedUI);

		return this.rootContainer;
	}

	public clearEntryStacks(): void {
		this.textEntryStack?.clearControls();
		this.optionsEntryStack?.clearControls();
	}

	public showHideScrollbar(show: boolean): void {
		this.textEntryScrollbar!.alpha = show ? 1 : 0;
		this.textEntryScrollbar!.isEnabled = show ? true : false;
	}

	public addTextDialogueEntry(
		dlgData: DialogueNodeData,
		charData?: CharacterData,
	): void {
		if (!dlgData || !this.textEntryStack) {
			return;
		}

		const entryRoot = new StackPanel("ui_dialogueNode_" + dlgData.id);
		entryRoot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		entryRoot.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		entryRoot.width = 1.0;
		entryRoot.adaptHeightToChildren = true;
		entryRoot.isVertical = true;

		if (charData) {
			const speakerLabel = new TextBlock(
				"ui_speaker_" + charData.name.trim().toLowerCase(),
				charData.name,
			);
			speakerLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
			speakerLabel.style = Themes.typography.header3;
			speakerLabel.color = charData.color || Themes.neutral2;
			speakerLabel.resizeToFit = true;
			entryRoot.addControl(speakerLabel);
		}

		const lineUI = new TextBlock("ui_line_" + dlgData.id, dlgData.text);
		lineUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		lineUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		lineUI.color = Themes.neutral2;
		lineUI.style = Themes.typography.bodyText;
		lineUI.resizeToFit = true;
		lineUI.textWrapping = TextWrapping.WordWrap;
		entryRoot.addControl(lineUI);

		this.textEntryStack.addControl(entryRoot);
	}

	public addContinueEntry(currDlgId: number, nextDlgId: number): void {
		if (!this.optionsEntryStack) {
			return;
		}

		const dmSystem = container.resolve(DialogueManagerSystem);
		if (!dmSystem) {
			return;
		}

		this.optionsEntryStack.clearControls();

		const buttonUI = Button.CreateSimpleButton(
			"ui_line_" + currDlgId,
			"Continue",
		);
		buttonUI.width = 1;
		buttonUI.heightInPixels = 40;
		buttonUI.color = Themes.neutral2;
		buttonUI.background = Themes.primary3 + Themes.textButtonDefaultOpacity;
		buttonUI.thickness = 0;

		if (buttonUI.textBlock) {
			buttonUI.textBlock.textHorizontalAlignment =
				Control.HORIZONTAL_ALIGNMENT_LEFT;
			buttonUI.textBlock.paddingLeftInPixels = 8;
			buttonUI.textBlock.color = Themes.neutral2;
			buttonUI.textBlock.style = Themes.typography.header3;
		}

		buttonUI.onPointerEnterObservable.add(() => {
			buttonUI.background = Themes.primary3 + Themes.textButtonHighlightOpacity;
		});
		buttonUI.onPointerOutObservable.add(() => {
			buttonUI.background = Themes.primary3 + Themes.textButtonDefaultOpacity;
		});
		buttonUI.onPointerClickObservable.addOnce(() => {
			dmSystem.runLine(nextDlgId);
		});

		this.optionsEntryStack.addControl(buttonUI);
	}

	public addExitEntry(): void {
		if (!this.optionsEntryStack) {
			return;
		}

		const dmSystem = container.resolve(DialogueManagerSystem);
		if (!dmSystem) {
			return;
		}

		this.optionsEntryStack.clearControls();

		const buttonUI = Button.CreateSimpleButton("ui_line_exit", "End Dialogue");
		buttonUI.width = 1;
		buttonUI.heightInPixels = 40;
		buttonUI.color = Themes.neutral2;
		buttonUI.background = Themes.primary3 + Themes.textButtonDefaultOpacity;
		buttonUI.thickness = 0;

		if (buttonUI.textBlock) {
			buttonUI.textBlock.textHorizontalAlignment =
				Control.HORIZONTAL_ALIGNMENT_LEFT;
			buttonUI.textBlock.paddingLeftInPixels = 8;
			buttonUI.textBlock.color = Themes.neutral2;
			buttonUI.textBlock.style = Themes.typography.header3;
		}

		buttonUI.onPointerEnterObservable.add(() => {
			buttonUI.background = Themes.primary3 + Themes.textButtonHighlightOpacity;
		});
		buttonUI.onPointerOutObservable.add(() => {
			buttonUI.background = Themes.primary3 + Themes.textButtonDefaultOpacity;
		});
		buttonUI.onPointerClickObservable.addOnce(() => {
			dmSystem.endDialogue();
		});

		this.optionsEntryStack.addControl(buttonUI);
	}

	public addChoiceEntries(choices: DialogueChoiceData[]): void {
		if (!this.optionsEntryStack) {
			return;
		}

		const dmSystem = container.resolve(DialogueManagerSystem);
		if (!dmSystem) {
			return;
		}

		this.optionsEntryStack.clearControls();

		choices.forEach((choiceData, index) => {
			if (!this.optionsEntryStack) {
				return;
			}

			const numChoice = index + 1;
			const buttonUI = Button.CreateSimpleButton(
				"ui_choice_" + numChoice,
				numChoice + ". " + choiceData.text,
			);
			buttonUI.width = 1;
			buttonUI.heightInPixels = 40;
			buttonUI.color = Themes.neutral2;
			buttonUI.background = Themes.primary3 + Themes.textButtonDefaultOpacity;
			buttonUI.thickness = 0;

			if (buttonUI.textBlock) {
				buttonUI.textBlock.textHorizontalAlignment =
					Control.HORIZONTAL_ALIGNMENT_LEFT;
				buttonUI.textBlock.paddingLeftInPixels = 8;
				buttonUI.textBlock.color = Themes.neutral2;
				buttonUI.textBlock.style = Themes.typography.header3;
			}

			buttonUI.onPointerEnterObservable.add(() => {
				buttonUI.background =
					Themes.primary3 + Themes.textButtonHighlightOpacity;
			});
			buttonUI.onPointerOutObservable.add(() => {
				buttonUI.background = Themes.primary3 + Themes.textButtonDefaultOpacity;
			});
			buttonUI.onPointerClickObservable.addOnce(() => {
				this.addTextDialogueEntry({
					id: index,
					text: choiceData.text,
				} as DialogueNodeData);
				dmSystem.runLine(choiceData.target_id);
			});

			this.optionsEntryStack.addControl(buttonUI);
		});
	}

	public setCharacterPortrait(charData?: CharacterData): void {
		if (!charData) {
			this.characterPortraitUI?.isVisible == false;
			return;
		}

		const charPortrait = this.characterPortraitUI?.getChildByName(
			"ui_charPortrait",
		) as Image;
		if (!charPortrait) {
			this.characterPortraitUI?.isVisible == false;
			return;
		}

		charPortrait.source = charData.spriteUri as string;
	}

	private createDialogueFeed(): Container {
		const dialogueFeedUI = new Rectangle("ui_dialogueFeed");
		dialogueFeedUI.isPointerBlocker = true;
		dialogueFeedUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		dialogueFeedUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		dialogueFeedUI.background =
			Themes.primary3 + Themes.dialogueBackgroundOpacity;
		dialogueFeedUI.color = Themes.primary1;
		dialogueFeedUI.thickness = 2;
		dialogueFeedUI.widthInPixels = 320;
		dialogueFeedUI.heightInPixels = 550;

		const dialogueFeedStack = new StackPanel("ui_dialogueFeedStack");
		dialogueFeedStack.width = 1;
		dialogueFeedStack.height = 1;
		dialogueFeedUI.addControl(dialogueFeedStack);

		const textEntryArea = new Container("ui_textEntryScroll");
		textEntryArea.isPointerBlocker = true;
		textEntryArea.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		textEntryArea.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		textEntryArea.widthInPixels = 285;
		textEntryArea.heightInPixels = 325;
		textEntryArea.alpha = 1;
		dialogueFeedStack.addControl(textEntryArea);

		const sizePerEntry = 80;

		this.textEntryStack = new StackPanel("ui_textEntryStack");
		this.textEntryStack.isPointerBlocker = true;
		this.textEntryStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.textEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.textEntryStack.width = 1;
		this.textEntryStack.spacing = 24;
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
		this.textEntryScrollbar.paddingTopInPixels = 8;
		this.textEntryScrollbar.paddingBottomInPixels = 8;
		this.textEntryScrollbar.onValueChangedObservable.add((value) => {
			if (!this.textEntryStack) {
				return;
			}

			const textEntryStackSize =
				(this.textEntryStack.children.length - 4) * sizePerEntry;
			this.textEntryStack.topInPixels = (value / 100) * textEntryStackSize;
		});
		this.textEntryScrollbar.value = 0;
		this.textEntryScrollbar.background = Themes.primary3;
		this.textEntryScrollbar.color = Themes.neutral1;
		this.showHideScrollbar(false);
		textEntryArea.addControl(this.textEntryScrollbar);

		this.optionsEntryStack = new StackPanel(this.optionEntryStackName);
		this.optionsEntryStack.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.optionsEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.optionsEntryStack.widthInPixels = 285;
		this.optionsEntryStack.adaptHeightToChildren = true;
		dialogueFeedStack.addControl(this.optionsEntryStack);

		return dialogueFeedUI;
	}
}
