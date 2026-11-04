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
import { ActionSlotKey } from "src/types/AbilityTypes";
import { EntityId } from "bitecs";
import ControlState from "src/states/ControlState";
import { queuePlayerAction } from "src/modules/CombatModule";

export default class ActionBarHUD implements IHUD {
    rootContainer: Nullable<Container> = null;

    private powerSlots: ActionSlot[] = [];
    private equipmentSlots: ActionSlot[] = [];

    private readonly ACTION_ABILITY_STACK_NAME = "ui_actionAbilityStack";
    private readonly ACTION_EQUIP_STACK_NAME = "ui_actionEquipStack";

    public createHudRoot(): Container {
        const newRootContainer = new Rectangle("ui_actionBar");
        newRootContainer.color = Themes.primary1;
        newRootContainer.background = Themes.primary3;
        newRootContainer.thickness = 1;
        newRootContainer.widthInPixels = 340;
        newRootContainer.heightInPixels = 60;
        newRootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        newRootContainer.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        newRootContainer.topInPixels = -4;
        newRootContainer.leftInPixels = -4;

        const actionGrid = this.createActionGrid();
        newRootContainer.addControl(actionGrid);

        const abilitiesLabel = this.createActionStackLabel(
            "ui_abilitiesLabel",
            "ABILITIES",
        );
        actionGrid.addControl(abilitiesLabel, 0, 0);

        const equipLabel = this.createActionStackLabel(
            "ui_equipLabel",
            "EQUIPMENT",
        );
        actionGrid.addControl(equipLabel, 0, 1);

        const actionAbilityStack = this.createActionSlotStack(
            this.ACTION_ABILITY_STACK_NAME,
        );
        actionGrid.addControl(actionAbilityStack, 1, 0);

        const actionEquipStack = this.createActionSlotStack(
            this.ACTION_EQUIP_STACK_NAME,
        );
        actionGrid.addControl(actionEquipStack, 1, 1);

        this.powerSlots = this.createActionSlots(
            actionAbilityStack,
            "ui_abilityslot",
        );
        this.equipmentSlots = this.createActionSlots(
            actionEquipStack,
            "ui_deviceslot",
        );

        this.rootContainer = newRootContainer;
        return this.rootContainer;
    }

    private createActionGrid(): Grid {
        const actionGrid = new Grid("ui_actionStack");
        actionGrid.addColumnDefinition(148);
        actionGrid.addColumnDefinition(148);
        actionGrid.addRowDefinition(16);
        actionGrid.addRowDefinition(36);
        actionGrid.width = 1;
        actionGrid.height = 1;
        return actionGrid;
    }

    private createActionStackLabel(
        labelName: string,
        labelText: string,
    ): TextBlock {
        const actionStackLabel = new TextBlock(labelName, labelText);
        actionStackLabel.color = Themes.neutral2;
        actionStackLabel.style = Themes.typography.header4;
        actionStackLabel.widthInPixels = 120;
        actionStackLabel.heightInPixels = 20;
        actionStackLabel.topInPixels = 4;
        actionStackLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        actionStackLabel.textHorizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        return actionStackLabel;
    }

    private createActionSlotStack(stackName: string): StackPanel {
        const actionSlotStack = new StackPanel(stackName);
        actionSlotStack.isVertical = false;
        actionSlotStack.spacing = 4;
        actionSlotStack.adaptWidthToChildren = true;
        actionSlotStack.adaptHeightToChildren = true;
        return actionSlotStack;
    }

    private createActionSlots(
        stack: StackPanel,
        slotName: string,
    ): ActionSlot[] {
        const actionSlots: ActionSlot[] = [];
        for (let i = 0; i < 4; i++) {
            const actionSlot = new ActionSlot(`${slotName}_${i}`, "", () => {});
            stack.addControl(actionSlot.rootContainer);
            actionSlots.push(actionSlot);
        }
        return actionSlots;
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

        const actionPowerData = actorState.actionData.get(ActionSlotKey.power);
        if (actionPowerData) {
            for (let i = 0; i < this.powerSlots.length; i++) {
                const powerSlot = this.powerSlots[i];
                if (!powerSlot) {
                    continue;
                }

                const powerData = actionPowerData[i];
                if (powerData) {
                    this.assignActionSlot({
                        actionSlot: powerSlot,
                        actionSlotKey: ActionSlotKey.power,
                        actionIndex: i,
                        iconUrl: (powerData.iconURL as string) || "",
                        actorEntityId: actorState.entityId,
                        controlState,
                    });
                } else {
                    powerSlot.setActionSlotIcon("");
                    powerSlot.setOnClickEvent(() => {});
                    powerSlot.setActionLabelText("");
                }
            }
        }
    }

    private assignActionSlot({
        actionSlot,
        actionSlotKey,
        actionIndex,
        iconUrl,
        actorEntityId,
        controlState,
    }: {
        actionSlot: ActionSlot;
        actionSlotKey: ActionSlotKey;
        actionIndex: number;
        iconUrl: string;
        actorEntityId: EntityId;
        controlState: ControlState;
    }) {
        const actionKeyLabel = this.getActionSlotKeyLabel(
            actionSlotKey,
            actionIndex,
            controlState,
        );
        if (actionKeyLabel === null) {
            return;
        }

        actionSlot.setActionSlotIcon(iconUrl);
        actionSlot.setOnClickEvent(() =>
            queuePlayerAction(actorEntityId, actionSlotKey, actionIndex),
        );
        actionSlot.setActionLabelText(actionKeyLabel);
    }

    private getActionSlotKeyLabel(
        actionSlotKey: ActionSlotKey,
        actionIndex: number,
        controlState: ControlState,
    ): string | null {
        if (actionSlotKey === ActionSlotKey.power) {
            const powerKey =
                controlState.controlSettings.powerKeys[actionIndex];
            if (powerKey === undefined) {
                return null;
            }
            return String.fromCharCode(powerKey).toUpperCase();
        }
        return null;
    }
}
