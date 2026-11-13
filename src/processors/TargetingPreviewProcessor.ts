import { EntityId } from "bitecs";
import { AbilityData } from "src/types/AbilityTypes";
import { TargetingInputType, TargetingShapeData } from "src/types/CollisionTypes";
import { Processor } from "./Processor";
import {
    updateUnitTargetingPreview,
    updateConfirmTargetingPreview,
    updateDirectionTargetingPreview,
} from "src/modules/TargetingPreviewModule";

export interface TargetingPreviewProps {
    sourceEntityId: EntityId;
    actionData: AbilityData;
    shape: TargetingShapeData | undefined;
}

export class TargetingPreviewProcessor implements Processor {
    private processorFunctions: Record<TargetingInputType, Function>;

    public constructor() {
        this.processorFunctions = {
            unit: updateUnitTargetingPreview,
            confirm: updateConfirmTargetingPreview,
            direction: updateDirectionTargetingPreview,
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