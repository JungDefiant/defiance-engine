import {
    CollisionBehaviorData,
    CollisionBehaviorType,
} from "src/types/CollisionTypes";
import { Processor } from "./Processor";
import { EntityId } from "bitecs";
import { GameEventTrigger } from "src/types/EventTypes";
import { checkEventByTrigger } from "src/modules/EventModule";

export interface CollisionBehaviorFunctionProps {
    sourceEntityId: EntityId;
    targetEntityId: EntityId;
    behavior: CollisionBehaviorData;
}

export type CollisionBehaviorFunction = (
    props: CollisionBehaviorFunctionProps,
) => void;

export class CollisionBehaviorProcessor implements Processor {
    private processorFunctions: Record<
        CollisionBehaviorType,
        CollisionBehaviorFunction
    >;

    public constructor() {
        this.processorFunctions = {
            Event: (props) => {
                const behavior = props.behavior;

                if (behavior.eventTrigger) {
                    checkEventByTrigger(
                        behavior.eventTrigger as GameEventTrigger,
                    );
                }
            },
            Ability: (props) => {},
            Custom: (props) => {
                const behavior = props.behavior;
                if (behavior.customBehavior) {
                    behavior.customBehavior(
                        props.sourceEntityId,
                        props.targetEntityId,
                    );
                }
            },
        };
    }

    setProcessorFunction(key: string, value: CollisionBehaviorFunction): void {
        const parsedKey = key as CollisionBehaviorType;
        this.processorFunctions[parsedKey] = value;
    }

    removeProcessorFunction(key: string): void {
        const parsedKey = key as CollisionBehaviorType;
        this.processorFunctions[parsedKey] = () => {};
    }

    getProcessorFunction(key: string): CollisionBehaviorFunction {
        const parsedKey = key as CollisionBehaviorType;
        return this.processorFunctions[parsedKey];
    }
}
