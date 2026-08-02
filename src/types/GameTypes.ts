import { Vector3 } from "@babylonjs/core";
import { EventData } from "src/types/EventTypes";

export class ControlSettings {
	powerActions: number[] = [
		"Q".charCodeAt(0),
		"W".charCodeAt(0),
		"E".charCodeAt(0),
		"R".charCodeAt(0),
		"D".charCodeAt(0),
		"F".charCodeAt(0),
	];
	deviceActions: number[] = [
		"1".charCodeAt(0),
		"2".charCodeAt(0),
		"3".charCodeAt(0),
		"4".charCodeAt(0),
	];
	tacticalPause: number = 32;
	switchPlayerLeft: number = "A".charCodeAt(0);
	switchPlayerRight: number = "S".charCodeAt(0);
}

export interface CampaignData {
	id: string;
	startSceneId: "";
	startDialogueId: "";
	flagIds: [];
	keyItemIds: [];
	startingPartyIds: string[];
}

export interface SceneData {
	id: string;
	startLocationId: string;
	modelURL: string;
	difficultyLevel: number;
	startMusic: string;
	dialogueFile: string;
	encounters: EncounterData;
	locations: LocationData[];
	modalRefs: string[];
}

export interface LocationData {
	id: string;
	exploreViewNodeId: string;
	combatViewNodeId: string;
	combatSpawnNodeId: string;
	interactables: InteractableData[];
	events: EventData[];
	doors: DoorData[];
}

export interface InteractableData {
	id: string;
	name: string;
	description: string;
	dialogueNodeId: string;
	interactableNodeId: string;
	viewPositionNodeId: string;
	guiPositionOffset: number[];
}

export interface DoorData {
	id: string;
	destination: string;
}

export interface EncounterData {
	[index: string]: string[];
}

export enum GameMode {
	MainMenu,
	Combat,
	Explore,
	Dialogue,
}

export interface DialogueNode {
	name: string;
	lines: DialogueLine[];
}

export interface DialogueLine {
	type: DialogueLineType;
	condition: ConditionFunction;
	character?: string;
	text?: string;
	options?: DialogueOptionLine[];
	cmd?: string;
	vars?: (string | number | Vector3)[];
}

export type DialogueLineType =
	| "Line"
	| "Options"
	| "Cmd"
	| "Line_condition"
	| "Cmd_condition";

export interface DialogueOptionLine {
	text: string;
	destinationNode: string;
	condition: ConditionFunction;
}

export interface ModalData {
	id: string;
	pages: ModalPage[];
}

export interface ModalPage {
	title: string;
	textBody: string;
	imageSrc?: string;
}

export type StoryVariable = string | number;

export interface ConditionFunction {
	(): boolean;
}
