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

    private mutationSlot: Nullable<ActionSlot> = null;
    private techniqueSlots: ActionSlot[] = [];
    private equipmentSlots: ActionSlot[] = [];

    private readonly ACTION_TECH_STACK_NAME = "ui_actionTechniqueStack";
    private readonly ACTION_EQUIP_STACK_NAME = "ui_actionEquipmentStack";

    public createHudRoot(): Container {
        const actionBarStack = new StackPanel("ui_actionStack");
        actionBarStack.isVertical = false;
        actionBarStack.spacing = 4;
        actionBarStack.widthInPixels = 220;
        actionBarStack.heightInPixels = 120;
        actionBarStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        actionBarStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        actionBarStack.topInPixels = -4;

        const actionStack = new StackPanel("ui_actionStack");
        actionStack.isVertical = true;
        actionStack.spacing = -1;
        actionStack.widthInPixels = 160;
        actionStack.heightInPixels = 80;
        actionStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        actionStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        actionBarStack.addControl(actionStack);

        const actionTechRoot = new Rectangle("ui_actionBar");
        actionTechRoot.color = Themes.primary1;
        actionTechRoot.background = Themes.primary3;
        actionTechRoot.thickness = 2;
        actionTechRoot.widthInPixels = 160;
        actionTechRoot.heightInPixels = 40;
        actionTechRoot.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        actionTechRoot.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        actionStack.addControl(actionTechRoot);

        const actionTechStack = this.createActionSlotStack(
            this.ACTION_TECH_STACK_NAME,
        );
        this.techniqueSlots = this.createActionSlots(
            actionTechStack,
            "ui_techniqueSlot",
        );
        actionTechRoot.addControl(actionTechStack);

        const actionEquipRoot = new Rectangle("ui_actionBar");
        actionEquipRoot.color = Themes.primary1;
        actionEquipRoot.background = Themes.primary3;
        actionEquipRoot.thickness = 2;
        actionEquipRoot.widthInPixels = 160;
        actionEquipRoot.heightInPixels = 40;
        actionEquipRoot.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        actionEquipRoot.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_CENTER;
        actionStack.addControl(actionEquipRoot);

        const actionEquipStack = this.createActionSlotStack(
            this.ACTION_EQUIP_STACK_NAME,
        );
        this.equipmentSlots = this.createActionSlots(
            actionEquipStack,
            "ui_equipmentSlot",
        );
        actionEquipRoot.addControl(actionEquipStack);

        this.mutationSlot = new ActionSlot(`ui_mutationSlot`, "", () => {});
        this.mutationSlot.rootContainer.widthInPixels = 48;
        this.mutationSlot.rootContainer.heightInPixels = 48;
        this.mutationSlot.rootContainer.thickness = 4;
        this.mutationSlot.rootContainer.verticalAlignment =
            Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.mutationSlot.rootContainer.horizontalAlignment =
            Control.HORIZONTAL_ALIGNMENT_RIGHT;
        actionBarStack.addControl(this.mutationSlot.rootContainer);

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

    private createActionSlots(
        stack: StackPanel,
        slotName: string,
    ): ActionSlot[] {
        const actionSlots: ActionSlot[] = [];
        for (let i = 0; i < 3; i++) {
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

        const actionTechniqueData = actorState.actionData.get(
            ActionSlotKey.technique,
        );
        if (actionTechniqueData) {
            for (let i = 0; i < this.techniqueSlots.length; i++) {
                const powerSlot = this.techniqueSlots[i];
                if (!powerSlot) {
                    continue;
                }

                const powerData = actionTechniqueData[i];
                if (powerData) {
                    this.assignActionSlot({
                        actionSlot: powerSlot,
                        actionSlotKey: ActionSlotKey.technique,
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

        const actionMutationData = actorState.actionData.get(
            ActionSlotKey.mutation,
        );
        if (actionMutationData) {
            const powerData = actionMutationData[0];
            const powerSlot = this.mutationSlot;
            if (!powerSlot) {
                return;
            }

            if (powerData) {
                this.assignActionSlot({
                    actionSlot: powerSlot,
                    actionSlotKey: ActionSlotKey.mutation,
                    actionIndex: 0,
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

        const actionEquipmentData = actorState.actionData.get(
            ActionSlotKey.equipment,
        );
        if (actionEquipmentData) {
            for (let i = 0; i < this.equipmentSlots.length; i++) {
                const powerSlot = this.equipmentSlots[i];
                if (!powerSlot) {
                    continue;
                }

                const powerData = actionEquipmentData[i];
                if (powerData) {
                    this.assignActionSlot({
                        actionSlot: powerSlot,
                        actionSlotKey: ActionSlotKey.equipment,
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
        if (actionSlotKey === ActionSlotKey.technique) {
            const techniqueKey =
                controlState.controlSettings.techniqueKeys[actionIndex];
            if (techniqueKey === undefined) {
                return null;
            }
            return String.fromCharCode(techniqueKey).toUpperCase();
        } else if (actionSlotKey === ActionSlotKey.mutation) {
            const mutationKey = controlState.controlSettings.mutationKey;
            if (mutationKey === undefined) {
                return null;
            }
            return String.fromCharCode(mutationKey).toUpperCase();
        } else if (actionSlotKey === ActionSlotKey.equipment) {
            const equipmentKey =
                controlState.controlSettings.equipmentKeys[actionIndex];
            if (equipmentKey === undefined) {
                return null;
            }
            return String.fromCharCode(equipmentKey).toUpperCase();
        }
        return null;
    }
}
