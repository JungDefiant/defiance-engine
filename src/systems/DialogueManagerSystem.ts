import { container, inject, singleton } from "tsyringe";
import ISystem from "./ISystem";
import {
	AbstractMesh,
	Nullable,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import UserInterfaceSystem from "./UserInterfaceSystem";
import SceneManagerSystem, {
	GameMode,
	InteractableData,
} from "./SceneManagerSystem";

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
			const dlgId = path.match(/dlg_[A-Za-z]+/)![0];
			this.dialogueData.set(dlgId, data);
		}
	}

	public update() {}

	public startDialogue(
		dlgId: string,
		itr: { data: InteractableData; mesh: AbstractMesh },
	) {
		const smSystem = container.resolve(SceneManagerSystem);
		const dlgHud = container.resolve(UserInterfaceSystem).getDialogueHud();
		const camera = smSystem.getActiveScene()?.activeCamera as UniversalCamera;

		if (!smSystem || !camera || !dlgHud || !this.dialogueData) {
			return;
		}

		smSystem.setGameMode(GameMode.Dialogue);

		dlgHud.clearEntryStacks();

		const viewCoords = itr.data.viewPosition;
		camera.position = itr.mesh.position.add(
			new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]),
		);
		// LATER: Implement offsetting camera target
		camera.setTarget(itr.mesh.position);

		this.activeDialogue = this.dialogueData.get(dlgId)!;
		this.runLine(0);
	}

	public runLine(id: number) {
		// Get dialogue HUD
		if (!this.activeDialogue) {
			return;
		}

		const dlgHud = container.resolve(UserInterfaceSystem).getDialogueHud();
		const dialogue = this.activeDialogue.dialogues[id];

		if (!dialogue || !dlgHud) {
			return;
		}

		let charData;
		const characterName = dialogue.character;
		if (characterName) {
			charData = this.activeDialogue.characters[characterName];
			if (charData) {
				// Set character portrait
				dlgHud.setCharacterPortrait(charData);
			}
		}

		if (dialogue.text) {
			// Display text entry for dialogue
			dlgHud.addTextDialogueEntry(dialogue, charData);
		}

		const choices = dialogue.choices;
		if (!choices || dialogue.is_end || choices.length < 1) {
			// Set end dialogue button
			dlgHud.addExitEntry();
		} else if (choices.length === 1) {
			// Set continue button
			dlgHud.addContinueEntry(dialogue.id, dialogue.choices[0].target_id);
		} else if (choices.length > 1) {
			// Set choices GUI
			dlgHud.addChoiceEntries(choices);
		}
	}

	public endDialogue() {
		// Switch mode back to Explore
		const smSystem = container.resolve(SceneManagerSystem);
		const scene = smSystem.getActiveScene();
		const camera = smSystem.getActiveScene()?.activeCamera as UniversalCamera;
		const locData = smSystem.getActiveLocationData();

		if (!smSystem || !scene || !camera || !locData) {
			return;
		}

		smSystem.setGameMode(GameMode.Explore);

		const viewCoords = locData.exploreViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		// LATER: Implement offsetting camera target
		camera.setTarget(new Vector3(0, 0, -40));
	}

	public displayText(text: string, speakerId?: string) {}

	public displayOptions(options: object[]) {}

	public setFlag(flag: string) {}

	public setSpeaker(charId: string) {}

	public playSound(soundUrl: string) {}

	public triggerCombat(encounterId: string) {}
}

export interface DialogueCharacterData {
	[index: string]: CharacterData;
}

export interface CharacterData {
	name: string;
	color?: string;
	spriteUri?: string;
}

export interface DialogueData {
	characters: DialogueCharacterData;
	dialogues: DialogueNodeData[];
}

export interface DialogueNodeData {
	id: number;
	character: string;
	text: string;
	choices: DialogueChoiceData[];
	is_start: boolean;
	is_end: boolean;
}

export interface DialogueChoiceData {
	text: string;
	target_id: number;
}
