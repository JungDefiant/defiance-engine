import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Nullable } from "@babylonjs/core";
import UserInterfaceSystem, { GameMode } from "./UserInterfaceSystem";
import { LocationData } from "./SceneManagerSystem";

@singleton()
export default class DialogueManagerSystem implements ISystem {
	private activeDialogue: Nullable<DialogueData> = null;
	private activeDialogueNodeIndex: number = 0;
	private activeDialogueLineIndex: number = 0;

	private uiSystem: Nullable<UserInterfaceSystem> = null;
	private dialogueData?: Map<string, DialogueData>;

	public async start() {
		// Import dialogue files
		const allData = await import.meta.glob("/src/data/dialogues/*.json");
		this.dialogueData = new Map<string, DialogueData>();
		for (const path in allData) {
			const data = (await allData[path]()) as DialogueData;
			this.dialogueData.set(data.id, data);
		}

		this.uiSystem = container.resolve(UserInterfaceSystem);
	}

	public update() {}

	public startDialogue(dlgId: string, nodeInd: number, locData: LocationData) {
		this.activeDialogue = this.dialogueData!.get(dlgId)!;
		this.activeDialogueNodeIndex = nodeInd;
		this.runActiveDialogue();
	}

	public runActiveDialogue() {
		if (!this.uiSystem) {
			return;
		}

		const dlgNodeData =
			this.activeDialogue?.nodes[this.activeDialogueNodeIndex];
		if (!dlgNodeData) {
			return;
		}

		const parsedLineData = this.parseLines(dlgNodeData, 0);
		this.uiSystem.setGameMode(GameMode.Dialogue);
		this.uiSystem
			.getDialogueHud()
			.addTextDialogueEntry(parsedLineData, this.activeDialogueLineIndex);
		// Add continue button if options aren't found in next line
		this.activeDialogueLineIndex++;
	}

	public parseLines(
		dialogueNode: DialogueNodeData,
		lineIndex: number,
	): DialogueLineData {
		const newLine = dialogueNode.lines[lineIndex];
		if (!newLine) {
			return {} as DialogueLineData;
		}

		return { line: newLine } as DialogueLineData;
	}

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
	lines: string[];
}

export interface DialogueLineData {
	speaker: string;
	speakerColor: string;
	speakerPortraitSrc: string;
	line: string;
}
