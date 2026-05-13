import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import {
	AbstractMesh,
	Nullable,
	UniversalCamera,
	Vector3,
	Viewport,
} from "@babylonjs/core";
import UserInterfaceSystem from "./UserInterfaceSystem";
import SceneManagerSystem from "./SceneManagerSystem";
import GameContext, { GameMode, InteractableData } from "../GameContext";

@singleton()
export default class DialogueManagerSystem implements ISystem {
	private activeDialogue: Nullable<DialogueData> = null;

	public async start() {}

	public update(deltaTime: number) {}

	public async startDialogue(
		dlgId: string,
		itr: { data: InteractableData; mesh: AbstractMesh },
	): Promise<void> {
		const context = container.resolve(GameContext);
		const response = await fetch(
			`/data/${context.campaignId}/dialogues/${dlgId}.json`,
		);
		const dlgData = (await response.json()) as DialogueData;
		if (!dlgData) {
			return;
		}

		const smSystem = container.resolve(SceneManagerSystem);
		const dlgHud = container.resolve(GameContext).dialogueHud;
		const camera = container.resolve(GameContext).scene
			.activeCamera as UniversalCamera;

		smSystem.setGameMode(GameMode.Dialogue);

		dlgHud.clearEntryStacks();

		const viewCoords = itr.data.viewPosition;
		camera.position = itr.mesh.position.add(
			new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]),
		);
		// LATER: Implement offsetting camera target
		camera.setTarget(itr.mesh.position);
		camera.viewport = new Viewport(0, 0, 1, 1);

		this.activeDialogue = dlgData;
		this.runLine(0);
	}

	public runLine(id: number) {
		// Get dialogue HUD
		if (!this.activeDialogue) {
			return;
		}

		const dlgHud = container.resolve(GameContext).dialogueHud;
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
		const context = container.resolve(GameContext);
		const camera = context.scene.activeCamera as UniversalCamera;
		const locData = context.locationData;

		smSystem.setGameMode(GameMode.Explore);

		const viewCoords = locData.exploreViewPosition;
		camera.position = new Vector3(viewCoords[0], viewCoords[1], viewCoords[2]);
		camera.viewport = new Viewport(0, 0.1, 1, 1);
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
