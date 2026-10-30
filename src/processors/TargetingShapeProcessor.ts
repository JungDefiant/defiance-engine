import { Vector3 } from "@babylonjs/core";
import {
    TargetingRangeType,
    TargetingShapeData,
} from "src/types/CollisionTypes";
import { AbilityData } from "src/types/AbilityTypes";
import { Processor } from "./Processor";
import { EntityId } from "bitecs";
import {
    deliverAbilityEffectsDirectly,
    deliverAbilityEffectsByProjectile,
    deliverAbilityEffectsBySphere,
    deliverAbilityEffectsBySphereProjectile,
    deliverAbilityEffectsByConeShape,
} from "src/modules/TargetingModule";

export interface TargetingShapeFunctionProps {
    sourceEntityId: EntityId;
    action: AbilityData;
    shape: TargetingShapeData;
    candidates: number[];
    targetPosition?: Vector3;
    targetEntityId?: EntityId;
}

export type TargetingShapeFunction = (
    props: TargetingShapeFunctionProps,
) => void;

export class TargetingShapeProcessor implements Processor {
    private processorFunctions: Record<TargetingRangeType, Function>;

    public constructor() {
        this.processorFunctions = {
            direct: deliverAbilityEffectsDirectly,
            projectile: deliverAbilityEffectsByProjectile,
            sphere: deliverAbilityEffectsBySphere,
            sphereProjectile: deliverAbilityEffectsBySphereProjectile,
            cone: deliverAbilityEffectsByConeShape,
        };
    }

    setProcessorFunction(key: string, value: Function): void {
        const parsedKey = key as TargetingRangeType;
        this.processorFunctions[parsedKey] = value;
    }

    removeProcessorFunction(key: string): void {
        const parsedKey = key as TargetingRangeType;
        this.processorFunctions[parsedKey] = () => {};
    }

    getProcessorFunction(key: string): Function {
        const parsedKey = key as TargetingRangeType;
        return this.processorFunctions[parsedKey];
    }
}
