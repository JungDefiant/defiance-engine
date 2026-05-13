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
import { ActionData, ActorData } from "../components/ActorData";
import { ActionSlot } from "./components/ActionSlot";
import { container } from "tsyringe";
import CombatManagerSystem from "../systems/CombatManagerSystem";
import ActorStateSystem from "../systems/ActorStateSystem";
import GameContext from "../GameContext";
import { EntityId } from "bitecs";

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

	public async setActionBar(eid: EntityId): Promise<void> {
		const cmSystem = container.resolve(CombatManagerSystem);
		const context = container.resolve(GameContext);
		const actorData = context.ActorDataComponent[eid];

		if (!actorData) {
			return;
		}

		for (let i = 0; i < this.abilitySlots.length; i++) {
			const abData = await actorData.abilityData[i];
			const abilitySlot = this.abilitySlots[i];
			if (!abilitySlot) {
				continue;
			}

			if (abData) {
				abilitySlot.setActionSlotIcon(abData.iconURL as string);
				abilitySlot.setOnClickEvent(() =>
					cmSystem.startQueueAction(context, eid, i),
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
				deviceSlot.setActionSlotIcon(devData.iconURL as string);
				deviceSlot.setOnClickEvent(() =>
					cmSystem.startQueueAction(context, eid, i),
				);
			} else {
				deviceSlot.setActionSlotIcon("");
				deviceSlot.setOnClickEvent(() => {});
				deviceSlot.setActionLabelText("");
			}
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
		abilitiesLabel.heightInPixels = 18;
		abilitiesLabel.topInPixels = 1;
		abilitiesLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		abilitiesLabel.textHorizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		actionGrid.addControl(abilitiesLabel, 0, 0);

		const devicesLabel = new TextBlock("ui_devicesLabel", "DEVICES");
		devicesLabel.color = Themes.neutral2;
		devicesLabel.style = Themes.typography.header3;
		devicesLabel.widthInPixels = 120;
		devicesLabel.heightInPixels = 18;
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
}
