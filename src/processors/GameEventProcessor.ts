import {
	triggerCombatEvent,
	triggerDialogueEvent,
	triggerModalEvent,
} from "src/modules/EventModule";
import { Processor } from "./Processor";
import { GameEventType } from "src/types/EventTypes";

export class GameEventProcessor implements Processor {
	private processorFunctions: Record<GameEventType, Function>;

	public constructor() {
		this.processorFunctions = {
			Dialogue: triggerDialogueEvent,
			Modal: triggerModalEvent,
			Combat: triggerCombatEvent,
		};
	}

	public setProcessorFunction(key: string, value: Function): void {
		const parsedKey = key as GameEventType;
		this.processorFunctions[parsedKey] = value;
	}

	public removeProcessorFunction(key: string): void {
		const parsedKey = key as GameEventType;
		this.processorFunctions[parsedKey] = () => {};
	}

	public getProcessorFunction(key: string): Function {
		const parsedKey = key as GameEventType;
		return this.processorFunctions[parsedKey];
	}
}
