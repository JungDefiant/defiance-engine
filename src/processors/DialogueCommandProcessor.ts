import {
	moveCameraDialogueCommand,
	setNumberVariableDialogueCommand,
	setStringVariableDialogueCommand,
	startCombatDialogueCommand,
} from "src/modules/DialogueModule";
import { DialogueCommand } from "src/types/DialogueTypes";
import { Processor } from "./Processor";

export class DialogueCommandProcessor implements Processor {
	private processorFunctions: Record<DialogueCommand, Function>;

	public constructor() {
		this.processorFunctions = {
			setnumbervar: setNumberVariableDialogueCommand,
			setstringvar: setStringVariableDialogueCommand,
			movecam: moveCameraDialogueCommand,
			startcombat: startCombatDialogueCommand,
		};
	}

	public setProcessorFunction(key: string, value: Function): void {
		const parsedKey = key as DialogueCommand;
		this.processorFunctions[parsedKey] = value;
	}

	public removeProcessorFunction(key: string): void {
		const parsedKey = key as DialogueCommand;
		this.processorFunctions[parsedKey] = () => {};
	}

	public getProcessorFunction(key: string): Function {
		const parsedKey = key as DialogueCommand;
		return this.processorFunctions[parsedKey];
	}
}
