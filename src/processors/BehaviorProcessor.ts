import {
	queueDefaultAggressiveAction,
	queueDefaultDefensiveAction,
	queueDefaultPassiveAction,
} from "src/modules/ActorBehaviorModule";
import { Processor } from "./Processor";
import { DefaultBehavior } from "src/types/BehaviorTypes";

export class BehaviorProcessor implements Processor {
	private processorFunctions: Record<DefaultBehavior, Function>;

	public constructor() {
		this.processorFunctions = {
			Passive: queueDefaultPassiveAction,
			Aggressive: queueDefaultAggressiveAction,
			Defensive: queueDefaultDefensiveAction,
		};
	}

	public setProcessorFunction(key: string, value: Function): void {
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
