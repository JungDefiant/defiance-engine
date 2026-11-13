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
import { ActionSlot } from "./abstract/ActionSlot";
import ActorStateComponent from "src/components/ActorStateComponent";
import { getControlState } from "src/modules/GameStateModule";
import { LoadoutSlotKey } from "src/types/AbilityTypes";
import ControlState from "src/states/ControlState";
import { beginActionTargeting } from "src/modules/ActionTargetingModule";

interface ActionSlotAssignmentProps {
    actionSlotKey: LoadoutSlotKey;
    actorState: ActorStateComponent;
    controlState: ControlState;
}

export default class ActionBarHUD implements IHUD {
    rootContainer: Nullable<Container> = null;

    private actionSlots: Map<LoadoutSlotKey, ActionSlot> = new Map();

    private readonly ACTION_EQUIP_STACK_NAME = "ui_actionEquipmentStack";

    public createHudRoot(): Container {
        const actionBarStack = new StackPanel("ui_actionStack");
        actionBarStack.isVertical = false;
        actionBarStack.spacing = 4;
        actionBarStack.widthInPixels = 320;
        actionBarStack.heightInPixels = 120;
        actionBarStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        actionBarStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        actionBarStack.topInPixels = -4;

        const weapon1Slot = new ActionSlot(`ui_weaponSlot`, "", () => {});
        weapon1Slot.rootContainer.widthInPixels = 64;
        weapon1Slot.rootContainer.heightInPixels = 64;
        weapon1Slot.rootContainer.thickness = 0;
        weapon1Slot.rootContainer.background = "";
        weapon1Slot.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_BOTTOM;
        weapon1Slot.rootContainer.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        actionBarStack.addControl(weapon1Slot.rootContainer);
        this.actionSlots.set(LoadoutSlotKey.weapon1, weapon1Slot);

        const actionBarMainRoot = new Rectangle("ui_actionBar");
        actionBarMainRoot.color = Themes.primary1;
        actionBarMainRoot.background = Themes.primary3;
        actionBarMainRoot.thickness = 2;
        actionBarMainRoot.widthInPixels = 160;
        actionBarMainRoot.heightInPixels = 40;
        actionBarMainRoot.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        actionBarMainRoot.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        actionBarStack.addControl(actionBarMainRoot);

        const actionEquipStack = this.createActionSlotStack(
            this.ACTION_EQUIP_STACK_NAME,
        );
        actionBarMainRoot.addControl(actionEquipStack);

        const weapon2Slot = new ActionSlot(`ui_weapon2Slot`, "", () => {});
        weapon2Slot.rootContainer.widthInPixels = 32;
        weapon2Slot.rootContainer.heightInPixels = 32;
        weapon2Slot.rootContainer.thickness = 2;
        weapon2Slot.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        weapon2Slot.rootContainer.horizontalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        actionEquipStack.addControl(weapon2Slot.rootContainer);
        this.actionSlots.set(LoadoutSlotKey.weapon2, weapon2Slot);

        const equipment1Slot = new ActionSlot(
            `ui_equipment1Slot`,
            "",
            () => {},
        );
        equipment1Slot.rootContainer.widthInPixels = 32;
        equipment1Slot.rootContainer.heightInPixels = 32;
        equipment1Slot.rootContainer.thickness = 2;
        equipment1Slot.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        equipment1Slot.rootContainer.horizontalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        actionEquipStack.addControl(equipment1Slot.rootContainer);
        this.actionSlots.set(LoadoutSlotKey.equipment1, equipment1Slot);

        const equipment2Slot = new ActionSlot(
            `ui_equipment2Slot`,
            "",
            () => {},
        );
        equipment2Slot.rootContainer.widthInPixels = 32;
        equipment2Slot.rootContainer.heightInPixels = 32;
        equipment2Slot.rootContainer.thickness = 2;
        equipment2Slot.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        equipment2Slot.rootContainer.horizontalAlignment =
            Control.VERTICAL_ALIGNMENT_CENTER;
        actionEquipStack.addControl(equipment2Slot.rootContainer);
        this.actionSlots.set(LoadoutSlotKey.equipment2, equipment2Slot);

        const mutationSlot = new ActionSlot(`ui_mutationSlot`, "", () => {});
        mutationSlot.rootContainer.widthInPixels = 48;
        mutationSlot.rootContainer.heightInPixels = 48;
        mutationSlot.rootContainer.thickness = 4;
        mutationSlot.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_BOTTOM;
        mutationSlot.rootContainer.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        actionBarStack.addControl(mutationSlot.rootContainer);
        this.actionSlots.set(LoadoutSlotKey.mutation, mutationSlot);

        this.rootContainer = actionBarStack;
        return this.rootContainer;
    }

    private createActionSlotStack(stackName: string): StackPanel {
        const actionSlotStack = new StackPanel(stackName);
        actionSlotStack.isVertical = false;
        actionSlotStack.spacing = 4;
        actionSlotStack.adaptWidthToChildren = true;
        actionSlotStack.adaptHeightToChildren = true;
        return actionSlotStack;
    }

    public showHideHud(show: boolean): void {
        if (!this.rootContainer) {
            return;
        }

        this.rootContainer.isVisible = show;
    }

    public setActionBar(actorState: ActorStateComponent): void {
        const controlState = getControlState();

        if (!actorState) {
            return;
        }

        Object.values(LoadoutSlotKey).forEach((actionSlotKey) => {
            this.assignActionSlot({
                actionSlotKey,
                actorState,
                controlState,
            });
        });
    }

    private assignActionSlot({
        actionSlotKey,
        actorState,
        controlState,
    }: ActionSlotAssignmentProps) {
        const actionSlot = this.actionSlots.get(actionSlotKey) as ActionSlot;
        if (!actionSlot) {
            return;
        }

        const actionData = actorState.actionData.get(actionSlotKey);
        if (!actionData) {
            actionSlot.setActionSlotIcon("");
            actionSlot.setOnClickEvent(() => {});
            actionSlot.setActionLabelText("");
            return;
        }

        const actionKeyLabel = this.getActionSlotKeyLabel(
            actionSlotKey,
            controlState,
        );
        if (!actionKeyLabel) {
            return;
        }

        actionSlot.setActionSlotIcon(actionData.iconURL || "");
        actionSlot.setOnClickEvent(() =>
            beginActionTargeting(actorState.entityId, actionSlotKey),
        );
        actionSlot.setActionLabelText(actionKeyLabel);
    }

    private getActionSlotKeyLabel(
        actionSlotKey: LoadoutSlotKey,
        controlState: ControlState,
    ): string | null {
        if (actionSlotKey === LoadoutSlotKey.weapon2) {
            const weaponAbilityKey =
                controlState.controlSettings.weaponAbilityKey;
            if (weaponAbilityKey === undefined) {
                return null;
            }
            return String.fromCharCode(weaponAbilityKey).toUpperCase();
        } else if (actionSlotKey === LoadoutSlotKey.mutation) {
            const mutationKey = controlState.controlSettings.mutationKey;
            if (mutationKey === undefined) {
                return null;
            }
            return String.fromCharCode(mutationKey).toUpperCase();
        } else if (actionSlotKey === LoadoutSlotKey.equipment1) {
            const equipmentKey = controlState.controlSettings.equipment1Key;
            if (equipmentKey === undefined) {
                return null;
            }
            return String.fromCharCode(equipmentKey).toUpperCase();
        } else if (actionSlotKey === LoadoutSlotKey.equipment2) {
            const equipmentKey = controlState.controlSettings.equipment2Key;
            if (equipmentKey === undefined) {
                return null;
            }
            return String.fromCharCode(equipmentKey).toUpperCase();
        }
        return null;
    }
}
