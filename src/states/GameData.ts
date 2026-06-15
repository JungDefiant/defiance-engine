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
	modelURL: string;
	difficultyLevel: number;
	startLocationId: string;
	dialogueFile: string;
	encounters: EncounterData;
	locations: LocationData[];
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

export interface EventData {
	id: string;
	flagTriggers: string[];
}

export enum GameMode {
	MainMenu,
	Combat,
	Explore,
	Dialogue,
}
