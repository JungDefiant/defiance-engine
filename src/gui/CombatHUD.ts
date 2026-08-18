import { Nullable } from "@babylonjs/core";
import {
	Container,
	Control,
	Grid,
	Rectangle,
	ScrollBar,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import IHUD from "src/gui/IHUD";
import { Themes } from "src/gui/Themes";
import { ActionSlot } from "src/gui/elements/ActionSlot";
import { getPublicRoot } from "src/modules/Utils";
import ActorStateComponent from "src/components/ActorStateComponent";
import { startQueueActionPlayer } from "src/modules/CombatModule";
import { getControlState } from "src/modules/GameStateModule";

export default class CombatHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private actionBarUI: Nullable<Container> = null;
	private messageDisplayUI: Nullable<Container> = null;
	private combatLogUI: Nullable<Container> = null;
	private combatLogStack: Nullable<StackPanel> = null;
	private combatLogScrollbar: Nullable<ScrollBar> = null;

	private abilitySlots: ActionSlot[] = [];
	private deviceSlots: ActionSlot[] = [];
	private messageDisplayText: Nullable<TextBlock> = null;

	private readonly actionAbilityStackName = "ui_actionAbilityStack";
	private readonly actionDeviceStackName = "ui_actionDeviceStack";
	private readonly sizePerCombatLogEntry = 32;

	public showHideHud(show: boolean): void {
		if (!this.rootContainer) {
			return;
		}

		this.rootContainer.isVisible = show;
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

		return this.rootContainer;
	}

	public async setActionBar(actorState: ActorStateComponent): Promise<void> {
		const controlState = getControlState();

		if (!actorState) {
			return;
		}

		for (let i = 0; i < this.abilitySlots.length; i++) {
			const abilityData = await actorState.powerData[i];
			const abilitySlot = this.abilitySlots[i];
			if (!abilitySlot) {
				continue;
			}

			if (abilityData) {
				abilitySlot.setActionSlotIcon(abilityData.iconURL as string);
				abilitySlot.setOnClickEvent(() =>
					startQueueActionPlayer(actorState.entityId, i),
				);
				abilitySlot.setActionLabelText(
					String.fromCharCode(
						controlState.controlSettings.powerActions[i],
					).toUpperCase(),
				);
			} else {
				abilitySlot.setActionSlotIcon("");
				abilitySlot.setOnClickEvent(() => {});
				abilitySlot.setActionLabelText("");
			}
		}

		if (!actorState.itemData) {
			return;
		}

		for (let i = 0; i < this.deviceSlots.length; i++) {
			const deviceData = await actorState.itemData[i];
			const deviceSlot = this.deviceSlots[i];
			if (!deviceSlot) {
				continue;
			}

			if (deviceData) {
				deviceSlot.setActionSlotIcon(
					`${getPublicRoot()}${deviceData.iconURL as string}`,
				);
				deviceSlot.setOnClickEvent(() =>
					startQueueActionPlayer(actorState.entityId, i),
				);
				deviceSlot.setActionLabelText(
					String.fromCharCode(
						controlState.controlSettings.deviceActions[i],
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

	public addCombatLogEntry(source: string, text: string) {
		if (!this.combatLogStack) {
			return;
		}

		const rootContainer = new Rectangle("ui_combatLogNode");
		rootContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
		rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		rootContainer.width = 1;
		rootContainer.heightInPixels = this.sizePerCombatLogEntry;
		rootContainer.thickness = 0;

		const entryUI = new TextBlock(
			"ui_combatLogEntry",
			`${source}: ${text}`,
		);
		entryUI.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		entryUI.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		entryUI.width = 1;
		entryUI.color = Themes.neutral2;
		entryUI.style = Themes.typography.caption;
		entryUI.resizeToFit = true;
		entryUI.textWrapping = 1;
		rootContainer.addControl(entryUI);

		this.combatLogStack.addControl(rootContainer);
	}

	public clearCombatEntries() {
		if (!this.combatLogStack) {
			return;
		}

		this.combatLogStack.clearControls();
		this.showHideScrollbar(true);
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
		devicesLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		actionGrid.addControl(devicesLabel, 0, 1);

		const actionAbilityStack = new StackPanel(this.actionAbilityStackName);
		actionAbilityStack.isVertical = false;
		actionAbilityStack.spacing = 4;
		actionAbilityStack.adaptWidthToChildren = true;
		actionAbilityStack.adaptHeightToChildren = true;
		actionGrid.addControl(actionAbilityStack, 1, 0);

		for (let i = 0; i < 8; i++) {
			const actionSlot = new ActionSlot(i.name, "", () => {});
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
			const actionSlot = new ActionSlot(i.name, "", () => {});
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
		messageDisplayUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;

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
		combatLogUI.addControl(combatLogHeader);

		const combatLogLabel = new TextBlock("ui_combatLogLabel", "COMBAT LOG");
		combatLogLabel.color = Themes.neutral2;
		combatLogLabel.style = Themes.typography.header4;
		combatLogLabel.width = 100;
		combatLogLabel.height = 100;
		combatLogLabel.textVerticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		combatLogLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		combatLogHeader.addControl(combatLogLabel);

		const combatLogScroll = new Container("ui_combatLogScroll");
		combatLogScroll.isPointerBlocker = true;
		combatLogScroll.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		combatLogScroll.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		combatLogScroll.widthInPixels = 160;
		combatLogScroll.heightInPixels = 160;
		combatLogScroll.alpha = 1;
		combatLogUI.addControl(combatLogScroll);

		this.combatLogStack = new StackPanel("ui_combatLogStack");
		this.combatLogStack.isPointerBlocker = true;
		this.combatLogStack.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.combatLogStack.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.combatLogStack.width = 1;
		this.combatLogStack.spacing = 4;
		this.combatLogStack.adaptHeightToChildren = true;
		this.combatLogStack.onControlAddedObservable.add(() => {
			if (!this.combatLogStack || !this.combatLogScrollbar) {
				return;
			}
			const textEntryStackSize =
				(this.combatLogStack.children.length + 2) *
				this.sizePerCombatLogEntry;
			if (textEntryStackSize < combatLogScroll.heightInPixels) {
				this.showHideScrollbar(false);
			} else {
				this.showHideScrollbar(true);
				this.combatLogScrollbar.thumbWidth =
					100 * (combatLogScroll.heightInPixels / textEntryStackSize);
			}
		});
		combatLogScroll.addControl(this.combatLogStack);

		this.combatLogScrollbar = new ScrollBar("ui_textEntryScrollbar");
		this.combatLogScrollbar.isPointerBlocker = true;
		this.combatLogScrollbar.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.combatLogScrollbar.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_TOP;
		this.combatLogScrollbar.isVertical = true;
		this.combatLogScrollbar.isThumbClamped = true;
		this.combatLogScrollbar.widthInPixels = 8;
		this.combatLogScrollbar.paddingTopInPixels = 8;
		this.combatLogScrollbar.paddingBottomInPixels = 8;
		this.combatLogScrollbar.onValueChangedObservable.add((value) => {
			if (!this.combatLogStack) {
				return;
			}

			const combatEntryStackSize =
				this.combatLogStack.children.length *
				this.sizePerCombatLogEntry;
			this.combatLogStack.topInPixels =
				(value / 100) * combatEntryStackSize;
		});
		this.combatLogScrollbar.value = 0;
		this.combatLogScrollbar.background = Themes.primary3;
		this.combatLogScrollbar.color = Themes.neutral1;
		this.showHideScrollbar(false);
		combatLogScroll.addControl(this.combatLogScrollbar);

		return combatLogUI;
	}

	public showHideScrollbar(show: boolean): void {
		if (!this.combatLogScrollbar) {
			return;
		}
		this.combatLogScrollbar.alpha = show ? 1 : 0;
		this.combatLogScrollbar.isEnabled = show ? true : false;
	}
}
