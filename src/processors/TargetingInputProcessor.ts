import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { AbilityData } from "src/types/AbilityTypes";
import {
    TargetingInputType,
    TargetingShapeData,
} from "src/types/CollisionTypes";
import { Processor } from "./Processor";
import {
    confirmUnitTargeting,
    confirmSelfTargeting,
    confirmDirectionTargeting,
} from "src/modules/ActionTargetingModule";

export interface TargetingInputFunctionProps {
    sourceEntityId: EntityId;
    actionData: AbilityData;
    shape: TargetingShapeData | undefined;
    pickedEntityId: EntityId;
    pickedGroundPosition: Nullable<Vector3>;
}

export class TargetingInputProcessor implements Processor {
    private processorFunctions: Record<TargetingInputType, Function>;

    public constructor() {
        this.processorFunctions = {
            unit: confirmUnitTargeting,
            confirm: confirmSelfTargeting,
            direction: confirmDirectionTargeting,
        };
    }

    setProcessorFunction(key: string, value: Function): void {
        const parsedKey = key as TargetingInputType;
        this.processorFunctions[parsedKey] = value;
    }

    removeProcessorFunction(key: string): void {
        const parsedKey = key as TargetingInputType;
        this.processorFunctions[parsedKey] = () => {};
    }

    getProcessorFunction(key: string): Function {
        const parsedKey = key as TargetingInputType;
        return this.processorFunctions[parsedKey];
    }
}