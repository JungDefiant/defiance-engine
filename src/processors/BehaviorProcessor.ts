import { EntityId } from "bitecs";
import {
    queueDefaultAggressiveAction,
    queueDefaultDefensiveAction,
    queueDefaultPassiveAction,
} from "src/modules/ActorBehaviorModule";
import { DefaultBehavior } from "src/types/BehaviorTypes";
import ActorStateComponent from "src/components/ActorStateComponent";
import { Processor } from "./Processor";

export interface ActorBehaviorFunctionProps {
    entityId: EntityId;
    actorState: ActorStateComponent;
}

export type ActorBehaviorFunction = (props: ActorBehaviorFunctionProps) => void;

export class BehaviorProcessor implements Processor {
    private processorFunctions: Record<DefaultBehavior, ActorBehaviorFunction>;

    public constructor() {
        this.processorFunctions = {
            Passive: queueDefaultPassiveAction,
            Aggressive: queueDefaultAggressiveAction,
            Defensive: queueDefaultDefensiveAction,
        };
    }

    public setProcessorFunction(
        key: string,
        value: ActorBehaviorFunction,
    ): void {
        const parsedKey = key as DefaultBehavior;
        this.processorFunctions[parsedKey] = value;
    }

    public removeProcessorFunction(key: string): void {
        const parsedKey = key as DefaultBehavior;
        this.processorFunctions[parsedKey] = () => {};
    }

    public getProcessorFunction(key: string): Function {
        const parsedKey = key as DefaultBehavior;
        return this.processorFunctions[parsedKey];
    }
}
