import {
	Container,
	Rectangle,
	Control,
	TextBlock,
	StackPanel,
	ScrollBar,
	Button,
	TextWrapping,
	Image,
} from "@babylonjs/gui";
import type IHUD from "src/gui/IHUD";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import { container } from "tsyringe";
import { Themes } from "src/gui/Themes";

import type {
	DialogueOptionLine,
	DialogueLine,
} from "src/systems/DialogueManagerSystem";
import { Rotate2dBlock, type Nullable } from "@babylonjs/core";
import StackPanelImage from "./components/StackPanelImage";
import GameState from "src/GameState";

export default class DialogueHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private dialogueFeedUI: Nullable<Container> = null;
	private textEntryStack: Nullable<StackPanel> = null;
	private textEntryScrollbar: Nullable<ScrollBar> = null;
	private optionsEntryStack: Nullable<StackPanel> = null;

	private readonly OPTION_ENTRY_STACK_NAME = "ui_optionsEntryStack";
	private readonly EMPTY_INPUT = "_";

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

	public addTextDialogueEntry(dlgData: DialogueLine): void {
		if (!dlgData || !this.textEntryStack) {
			return;
		}

		const rootContainer = new Rectangle("ui_dialogueNode");
		rootContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		rootContainer.width = "100%";
		rootContainer.adaptHeightToChildren = true;

		const stackPanel = new StackPanelImage("ui_dialogueStackPanel", "");
		stackPanel.isVertical = true;
		stackPanel.width = "100%";
		stackPanel.adaptHeightToChildren = true;
		stackPanel.spacing = 4;
		rootContainer.addControl(stackPanel);

		const hasSpeaker =
			dlgData.character && dlgData.character !== this.EMPTY_INPUT;
		if (dlgData.character && hasSpeaker) {
			stackPanel.source = "./sprites/dialogue/gui_textbox.png";

			const speakerLabel = new TextBlock(
				"ui_speaker_" + dlgData.character.trim().toLowerCase(),
				dlgData.character,
			);
			speakerLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
			speakerLabel.style = Themes.typography.header3;
			speakerLabel.color = Themes.primary3;
			speakerLabel.paddingLeftInPixels = 16;
			speakerLabel.paddingTopInPixels = 4;
			speakerLabel.resizeToFit = true;
			stackPanel.addControl(speakerLabel);

			rootContainer.background = "";
			rootContainer.color = "";
			rootContainer.thickness = 0;
		} else {
			rootContainer.background = Themes.warning;
			rootContainer.color = Themes.primary3;
			rootContainer.thickness = 2;
		}

		const lineUI = new TextBlock("ui_line", dlgData.text);
		lineUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		lineUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		lineUI.color = Themes.primary3;
		lineUI.style = Themes.typography.bodyText;
		lineUI.resizeToFit = true;
		lineUI.textWrapping = TextWrapping.WordWrap;
		if (hasSpeaker) {
			lineUI.paddingLeftInPixels = lineUI.paddingRightInPixels = 16;
			lineUI.paddingBottomInPixels = 4;
		} else {
			lineUI.paddingBottomInPixels =
				lineUI.paddingTopInPixels =
				lineUI.paddingLeftInPixels =
				lineUI.paddingRightInPixels =
					8;
		}
		stackPanel.addControl(lineUI);

		this.textEntryStack.addControl(rootContainer);
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
		buttonUI.color = Themes.primary1;
		buttonUI.background = Themes.primary3;
		buttonUI.thickness = 2;

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
		buttonUI.color = Themes.primary1;
		buttonUI.background = Themes.primary3;
		buttonUI.thickness = 2;

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

	public addChoiceEntries(choices: DialogueOptionLine[]): void {
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
			buttonUI.color = Themes.primary1;
			buttonUI.background = Themes.primary3;
			buttonUI.thickness = 2;

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
				const gameState = container.resolve(GameState);
				const pcName =
					gameState.ActorDataComponent[gameState.playerEIDs[0]].name;

				if (
					!choiceData.destinationNode ||
					choiceData.destinationNode === this.EMPTY_INPUT
				) {
					this.addTextDialogueEntry({
						type: "Line",
						character: pcName,
						id: index,
						text: choiceData.text,
					} as DialogueLine);
					this.addExitEntry();
					return;
				}

				this.addTextDialogueEntry({
					type: "Line",
					character: pcName,
					id: index,
					text: choiceData.text,
				} as DialogueLine);
				dmSystem.startDialogueNode(choiceData.destinationNode);
			});

			this.optionsEntryStack.addControl(buttonUI);
		});
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
		this.textEntryStack.spacing = 8;
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

		this.optionsEntryStack = new StackPanel(this.OPTION_ENTRY_STACK_NAME);
		this.optionsEntryStack.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.optionsEntryStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.optionsEntryStack.widthInPixels = 285;
		this.optionsEntryStack.adaptHeightToChildren = true;
		dialogueFeedStack.addControl(this.optionsEntryStack);

		return dialogueFeedUI;
	}
}
