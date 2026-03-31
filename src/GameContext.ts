import { Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { World } from "bitecs";
import { singleton } from "tsyringe";
import { ActorData } from "./components/ActorData";

@singleton()
export default class GameContext {
	public readonly campaignId: string;
	public readonly world: World;
	public readonly scene: Scene;
	public readonly sceneData: SceneData;
	public readonly locationData: LocationData;
	public readonly locationGUI: AdvancedDynamicTexture;

	public readonly ActorComponent: ActorData[] = [];

	public constructor(
		campaignId: string,
		world: World,
		scene: Scene,
		sceneData: SceneData,
		locationData: LocationData,
		locationGUI: AdvancedDynamicTexture,
	) {
		this.campaignId = campaignId;
		this.world = world;
		this.scene = scene;
		this.sceneData = sceneData;
		this.locationData = locationData;
		this.locationGUI = locationGUI;
	}
}

export interface SceneData {
	id: string;
	difficultyLevel: number;
	startLocationId: string;
	locations: LocationData[];
	encounters: EncounterData;
}

export interface LocationData {
	id: string;
	modelURL: string;
	exploreViewPosition: number[];
	combatViewPosition: number[];
	interactables: InteractableData[];
	events: EventData[];
}

export interface InteractableData {
	id: string;
	name: string;
	description: string;
	dialogueNodeId: string;
	attachedModelId: string;
	viewPosition: number[];
	guiPositionOffset: number[];
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
