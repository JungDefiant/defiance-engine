import { Nullable } from "@babylonjs/core";
import {
	Button,
	Container,
	Control,
	Grid,
	Rectangle,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import IHUD from "src/gui/IHUD";
import { Themes } from "src/gui/Themes";
import { ActionSlot } from "src/gui/components/ActionSlot";
import { container } from "tsyringe";
import CombatManagerSystem from "src/systems/CombatManagerSystem";
import GameState from "src/GameState";
import { ActorData } from "src/components/ActorData";
import { getPublicRoot } from "src/Utils";

export default class CombatHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private actionBarUI: Nullable<Container> = null;
	private messageDisplayUI: Nullable<Container> = null;
	private combatLogUI: Nullable<Container> = null;
	private victoryScreenUI: Nullable<Container> = null;

	private abilitySlots: ActionSlot[] = [];
	private deviceSlots: ActionSlot[] = [];
	private messageDisplayText: Nullable<TextBlock> = null;

	private readonly actionAbilityStackName = "ui_actionAbilityStack";
	private readonly actionDeviceStackName = "ui_actionDeviceStack";

	public showHideHud(show: boolean): void {
		if (!this.rootContainer) {
			return;
		}

		this.rootContainer.isVisible = show;
	}

	public showHideVictoryScreen(show: boolean): void {
		if (!this.victoryScreenUI) {
			return;
		}

		this.victoryScreenUI.isVisible = show;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_combatHUD");

		const backgroundUI = new Rectangle("ui_combatBgUI");
		backgroundUI.width = 1;
		backgroundUI.heightInPixels = 50;
		backgroundUI.background = Themes.primary3;
		backgroundUI.thickness = 0;
		backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.rootContainer.addControl(backgroundUI);

		this.actionBarUI = this.createActionBar();
		backgroundUI.addControl(this.actionBarUI);

		const messageDisplay = this.createMessageDisplay();
		this.messageDisplayUI = messageDisplay.root;
		this.messageDisplayText = messageDisplay.text;
		this.rootContainer.addControl(this.messageDisplayUI);
		this.messageDisplayUI.isVisible = false;

		this.combatLogUI = this.createCombatLog();
		this.rootContainer.addControl(this.combatLogUI);

		this.victoryScreenUI = this.createVictoryScreen();
		this.rootContainer.addControl(this.victoryScreenUI);
		this.victoryScreenUI.isVisible = false;

		return this.rootContainer;
	}

	public async setActionBar(
		actorData: ActorData,
		cmSystem: CombatManagerSystem,
		gameState: GameState,
	): Promise<void> {
		if (!actorData) {
			return;
		}

		for (let i = 0; i < this.abilitySlots.length; i++) {
			const abData = await actorData.powerData[i];
			const abilitySlot = this.abilitySlots[i];
			if (!abilitySlot) {
				continue;
			}

			if (abData) {
				abilitySlot.setActionSlotIcon(abData.iconURL as string);
				abilitySlot.setOnClickEvent(() =>
					cmSystem.startQueueAction(gameState, actorData.entityId, i),
				);
				abilitySlot.setActionLabelText(
					String.fromCharCode(
						gameState.controlSettings.powerActions[i],
					).toUpperCase(),
				);
			} else {
				abilitySlot.setActionSlotIcon("");
				abilitySlot.setOnClickEvent(() => {});
				abilitySlot.setActionLabelText("");
			}
		}

		if (!actorData.itemData) {
			return;
		}

		for (let i = 0; i < this.deviceSlots.length; i++) {
			const devData = await actorData.itemData[i];
			const deviceSlot = this.deviceSlots[i];
			if (!deviceSlot) {
				continue;
			}

			if (devData) {
				deviceSlot.setActionSlotIcon(
					`${getPublicRoot()}${devData.iconURL as string}`,
				);
				deviceSlot.setOnClickEvent(() =>
					cmSystem.startQueueAction(gameState, actorData.entityId, i),
				);
				deviceSlot.setActionLabelText(
					String.fromCharCode(
						gameState.controlSettings.deviceActions[i],
					).toUpperCase(),
				);
			} else {
				deviceSlot.setActionSlotIcon("");
				deviceSlot.setOnClickEvent(() => {});
				deviceSlot.setActionLabelText("");
			}
		}
	}

	public setMessageDisplay(show: boolean, message?: string) {
		if (!this.messageDisplayUI) {
			return;
		}

		this.messageDisplayUI.isVisible = show;
		if (show && message && this.messageDisplayText) {
			this.messageDisplayText.text = message;
		}
	}

	private createActionBar(): Container {
		const actionBarUI = new Rectangle("ui_actionBar");
		actionBarUI.color = Themes.primary1;
		actionBarUI.background = Themes.primary3;
		actionBarUI.thickness = 2;
		actionBarUI.widthInPixels = 470;
		actionBarUI.heightInPixels = 54;
		actionBarUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

		const actionGrid = new Grid("ui_actionStack");
		actionGrid.addColumnDefinition(270);
		actionGrid.addColumnDefinition(145);
		actionGrid.addRowDefinition(16);
		actionGrid.addRowDefinition(40);
		actionGrid.width = 1;
		actionGrid.height = 1;

		actionBarUI.addControl(actionGrid);

		const abilitiesLabel = new TextBlock("ui_abilitiesLabel", "ABILITIES");
		abilitiesLabel.color = Themes.neutral2;
		abilitiesLabel.style = Themes.typography.header4;
		abilitiesLabel.widthInPixels = 120;
		abilitiesLabel.heightInPixels = 20;
		abilitiesLabel.topInPixels = 1;
		abilitiesLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		abilitiesLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		actionGrid.addControl(abilitiesLabel, 0, 0);

		const devicesLabel = new TextBlock("ui_devicesLabel", "DEVICES");
		devicesLabel.color = Themes.neutral2;
		devicesLabel.style = Themes.typography.header4;
		devicesLabel.widthInPixels = 120;
		devicesLabel.heightInPixels = 20;
		devicesLabel.topInPixels = 1;
		devicesLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		devicesLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		actionGrid.addControl(devicesLabel, 0, 1);

		const actionAbilityStack = new StackPanel(this.actionAbilityStackName);
		actionAbilityStack.isVertical = false;
		actionAbilityStack.spacing = 4;
		actionAbilityStack.adaptWidthToChildren = true;
		actionAbilityStack.adaptHeightToChildren = true;
		actionGrid.addControl(actionAbilityStack, 1, 0);

		for (let i = 0; i < 8; i++) {
			const actionSlot = new ActionSlot(i.toString(), "", () => {});
			actionAbilityStack.addControl(actionSlot.rootContainer);
			this.abilitySlots.push(actionSlot);
		}

		const actionDeviceStack = new StackPanel(this.actionDeviceStackName);
		actionDeviceStack.isVertical = false;
		actionDeviceStack.spacing = 4;
		actionDeviceStack.adaptWidthToChildren = true;
		actionDeviceStack.adaptHeightToChildren = true;
		actionGrid.addControl(actionDeviceStack, 1, 1);

		for (let i = 0; i < 4; i++) {
			const actionSlot = new ActionSlot(i.toString(), "", () => {});
			actionDeviceStack.addControl(actionSlot.rootContainer);
			this.deviceSlots.push(actionSlot);
		}

		return actionBarUI;
	}

	private createMessageDisplay(): { root: Container; text: TextBlock } {
		const messageDisplayUI = new Rectangle("ui_messageDisplay");
		messageDisplayUI.color = Themes.primary1;
		messageDisplayUI.background = Themes.primary3;
		messageDisplayUI.thickness = 2;
		messageDisplayUI.widthInPixels = 280;
		messageDisplayUI.heightInPixels = 48;
		messageDisplayUI.top = 5;
		messageDisplayUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		messageDisplayUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

		const messageDisplayText = new TextBlock("ui_messageDisplayText", "");
		messageDisplayText.color = Themes.neutral2;
		messageDisplayText.style = Themes.typography.header4;
		messageDisplayText.width = 100;
		messageDisplayText.height = 100;
		messageDisplayText.textVerticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		messageDisplayText.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		messageDisplayUI.addControl(messageDisplayText);

		return { root: messageDisplayUI, text: messageDisplayText };
	}

	private createCombatLog(): Container {
		const combatLogUI = new Rectangle("ui_combatLog");
		combatLogUI.color = Themes.primary1;
		combatLogUI.background = `${Themes.primary3}${Themes.dialogueBackgroundOpacity}`;
		combatLogUI.thickness = 1;
		combatLogUI.widthInPixels = 160;
		combatLogUI.heightInPixels = 180;
		combatLogUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		combatLogUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

		const combatLogHeader = new Rectangle("ui_combatLogHeader");
		combatLogHeader.color = Themes.primary1;
		combatLogHeader.background = Themes.primary3;
		combatLogHeader.thickness = 2;
		combatLogHeader.widthInPixels = 160;
		combatLogHeader.heightInPixels = 20;
		combatLogHeader.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

		const combatLogLabel = new TextBlock("ui_combatLogLabel", "COMBAT LOG");
		combatLogLabel.color = Themes.neutral2;
		combatLogLabel.style = Themes.typography.header4;
		combatLogLabel.width = 100;
		combatLogLabel.height = 100;
		combatLogLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		combatLogLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		combatLogUI.addControl(combatLogHeader);

		return combatLogUI;
	}

	// CONVERT TO SCREEN; DISPLAYED AT TOP Z-INDEX
	private createVictoryScreen(): Container {
		const victoryScreenUI = new StackPanel("ui_victoryScreen");
		victoryScreenUI.isVertical = true;
		victoryScreenUI.spacing = 20;
		victoryScreenUI.widthInPixels = 360;
		victoryScreenUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		victoryScreenUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		victoryScreenUI.top = 200;

		const victoryScreenLabel = new TextBlock(
			"ui_victoryScreenLabel",
			"VICTORY",
		);
		victoryScreenLabel.color = Themes.neutral2;
		victoryScreenLabel.style = Themes.typography.header1;
		victoryScreenLabel.outlineWidth = 2;
		victoryScreenLabel.outlineColor = Themes.primary3;
		victoryScreenLabel.heightInPixels = 64;
		victoryScreenUI.addControl(victoryScreenLabel);

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
				this.showHideVictoryScreen(false);
			}
		});
		victoryScreenUI.addControl(continueButton);

		return victoryScreenUI;
	}
}
