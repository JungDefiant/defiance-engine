import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Nullable } from "@babylonjs/core";
import UserInterfaceSystem from "./UserInterfaceSystem";

@singleton()
export default class DialogueManagerSystem implements ISystem {
	private activeDialogue: Nullable<DialogueData> = null;

	private dialogueData?: Map<string, DialogueData>;

	public async start() {
		// Import dialogue files
		const allData = await import.meta.glob("/src/data/dialogues/*.json");
		this.dialogueData = new Map<string, DialogueData>();
		for (const path in allData) {
			const data = (await allData[path]()) as DialogueData;
			this.dialogueData.set(data.id, data);
		}
	}

	public update() {}

	public startDialogue(dlgId: string) {
		const dialogue = this.dialogueData!.get(dlgId);
		const uiSystem = container.resolve(UserInterfaceSystem);
		const dialogueHud = uiSystem.getDialogueHud();

		dialogueHud.addTextDialogueEntry(dialogue!.nodes[0]!.lines[0]!, 0);
	}

	public parseLine(lineIndex: number) {}

	public displayText(text: string, speakerId?: string) {}

	public displayOptions(options: object[]) {}

	public setFlag(flag: string) {}

	public setSpeaker(charId: string) {}

	public playSound(soundUrl: string) {}

	public triggerCombat(encounterId: string) {}
}

export interface DialogueData {
	id: string;
	nodes: DialogueNodeData[];
}

export interface DialogueNodeData {
	id: string;
	lines: DialogueLineData[];
}

export interface DialogueLineData {
	speaker: string;
	speakerColor: string;
	speakerPortraitSrc: string;
	line: string;
}
