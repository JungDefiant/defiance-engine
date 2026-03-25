import { Nullable } from "@babylonjs/core";
import {
	AdvancedDynamicTexture,
	Container,
	Control,
	Grid,
	Rectangle,
	StackPanel,
	TextBlock,
	TextWrapping,
} from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Themes } from "./Themes";

export default class CombatHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private actionBarUI: Nullable<Container> = null;

	private readonly actionAbilityStackName = "ui_actionAbilityStack";
	private readonly actionDeviceStackName = "ui_actionDeviceStack";

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_combatHUD");

		this.actionBarUI = this.createActionBar();
		this.rootContainer.addControl(this.actionBarUI);

		return this.rootContainer;
	}

	private createActionBar(): Container {
		const actionBarUI = new Rectangle("ui_actionBar");
		actionBarUI.color = Themes.primary1;
		actionBarUI.background = Themes.primary3;
		actionBarUI.thickness = 2;
		actionBarUI.widthInPixels = 470;
		actionBarUI.heightInPixels = 54;
		actionBarUI.topInPixels = 273;

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
			const actionSlot = this.createActionSlot(i.toString());
			actionAbilityStack.addControl(actionSlot);
		}

		const actionDeviceStack = new StackPanel(this.actionDeviceStackName);
		actionDeviceStack.isVertical = false;
		actionDeviceStack.spacing = 4;
		actionDeviceStack.adaptWidthToChildren = true;
		actionDeviceStack.adaptHeightToChildren = true;
		actionGrid.addControl(actionDeviceStack, 1, 1);

		for (let i = 0; i < 4; i++) {
			const actionSlot = this.createActionSlot(i.toString());
			actionDeviceStack.addControl(actionSlot);
		}

		return actionBarUI;
	}

	private createActionSlot(label: string) {
		const actionSlotUI = new Rectangle("ui_actionSlot_" + label);
		actionSlotUI.color = Themes.primary1;
		actionSlotUI.background = Themes.primary3;
		actionSlotUI.thickness = 2;
		actionSlotUI.widthInPixels = 32;
		actionSlotUI.heightInPixels = 32;

		const actionSlotLabel = new TextBlock("ui_actionSlotLabel", "Ability");
		actionSlotLabel.color = Themes.neutral2;
		actionSlotLabel.style = Themes.typography.bodyText;
		actionSlotLabel.widthInPixels = 12;
		actionSlotLabel.heightInPixels = 12;
		actionSlotLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		actionSlotLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;

		return actionSlotUI;
	}
}
