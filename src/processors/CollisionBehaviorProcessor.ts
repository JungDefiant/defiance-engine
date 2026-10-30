import { CollisionBehaviorType } from "src/types/CollisionTypes";
import { Processor } from "./Processor";

export class CollisionBehaviorProcessor implements Processor {
    private processorFunctions: Record<CollisionBehaviorType, Function>;

    public constructor() {
        this.processorFunctions = {
            Event: () => {},
            Ability: () => {},
            Custom: () => {},
        };
    }

    setProcessorFunction(key: string, value: Function): void {
        const parsedKey = key as CollisionBehaviorType;
        this.processorFunctions[parsedKey] = value;
    }

    removeProcessorFunction(key: string): void {
        const parsedKey = key as CollisionBehaviorType;
        this.processorFunctions[parsedKey] = () => {};
    }

    getProcessorFunction(key: string): Function {
        const parsedKey = key as CollisionBehaviorType;
        return this.processorFunctions[parsedKey];
    }
}
