import { Nullable } from "@babylonjs/core";
import {
	Container,
	Control,
	Grid,
	Rectangle,
	StackPanel,
	TextBlock,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Themes } from "./Themes";
import { AbilityData } from "../components/ActorData";
import { ActionSlot } from "./components/ActionSlot";

export default class CombatHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private actionBarUI: Nullable<Container> = null;
	private abilitySlots: ActionSlot[] = [];
	private deviceSlots: ActionSlot[] = [];

	private readonly actionAbilityStackName = "ui_actionAbilityStack";
	private readonly actionDeviceStackName = "ui_actionDeviceStack";

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_combatHUD");

		const backgroundUI = new Rectangle("ui_exploreBgUI");
		backgroundUI.width = 1;
		backgroundUI.heightInPixels = 50;
		backgroundUI.background = Themes.primary3;
		backgroundUI.thickness = 0;
		backgroundUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.rootContainer.addControl(backgroundUI);

		this.actionBarUI = this.createActionBar();
		backgroundUI.addControl(this.actionBarUI);

		return this.rootContainer;
	}

	public setActionBar(abilities: AbilityData[], devices: AbilityData[]): void {
		for (let i = 0; i < abilities.length; i++) {
			const abilitySlot = this.abilitySlots[i];
			if (!abilitySlot || !abilities[i].iconURL) {
				return;
			}

			abilitySlot.setActionSlotIcon(abilities[i].iconURL as string);
		}

		for (let i = 0; i < devices.length; i++) {
			const deviceSlot = this.deviceSlots[i];
			if (!deviceSlot || !devices[i].iconURL) {
				return;
			}

			deviceSlot.setActionSlotIcon(devices[i].iconURL as string);
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
		abilitiesLabel.style = Themes.typography.header3;
		abilitiesLabel.widthInPixels = 120;
		abilitiesLabel.heightInPixels = 20;
		abilitiesLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		abilitiesLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		actionGrid.addControl(abilitiesLabel, 0, 0);

		const devicesLabel = new TextBlock("ui_devicesLabel", "DEVICES");
		devicesLabel.color = Themes.neutral2;
		devicesLabel.style = Themes.typography.header3;
		devicesLabel.widthInPixels = 120;
		devicesLabel.heightInPixels = 20;
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
			const actionSlot = new ActionSlot(i.toString(), "");
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
			const actionSlot = new ActionSlot(i.toString(), "");
			actionDeviceStack.addControl(actionSlot.rootContainer);
			this.deviceSlots.push(actionSlot);
		}

		return actionBarUI;
	}
}
