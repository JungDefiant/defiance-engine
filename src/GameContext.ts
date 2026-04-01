import { Mesh, Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { EntityId, observe, onSet, World } from "bitecs";
import { singleton } from "tsyringe";
import { ActorData } from "./components/ActorData";
import { EnemyGUI } from "./components/EnemyGUI";
import { PlayerGUI } from "./components/PlayerGUI";

@singleton()
export default class GameContext {
	public readonly campaignId: string;
	public readonly gameMode: GameMode;
	public readonly world: World;
	public readonly scene: Scene;
	public readonly sceneData: SceneData;
	public readonly locationData: LocationData;
	public readonly locationGUI: AdvancedDynamicTexture;
	public readonly combatGUI: AdvancedDynamicTexture;

	public readonly ActorDataComponent: ActorData[] = [];
	public readonly PlayerGUIComponent: PlayerGUI[] = [];
	public readonly EnemyGUIComponent: EnemyGUI[] = [];
	public readonly EnemySprite: Mesh[] = [];

	public constructor(
		campaignId: string,
		gameMode: GameMode,
		world: World,
		scene: Scene,
		sceneData: SceneData,
		locationData: LocationData,
		locationGUI: AdvancedDynamicTexture,
		combatGUI: AdvancedDynamicTexture,
	) {
		this.campaignId = campaignId;
		this.gameMode = gameMode;
		this.world = world;
		this.scene = scene;
		this.sceneData = sceneData;
		this.locationData = locationData;
		this.locationGUI = locationGUI;
		this.combatGUI = combatGUI;

		observe(
			this.world,
			onSet(this.ActorDataComponent),
			(eid: EntityId, params: ActorData) => {
				this.ActorDataComponent[eid] = params;
			},
		);

		observe(
			this.world,
			onSet(this.PlayerGUIComponent),
			(eid: EntityId, params: PlayerGUI) => {
				this.PlayerGUIComponent[eid] = params;
			},
		);

		observe(
			this.world,
			onSet(this.EnemyGUIComponent),
			(eid: EntityId, params: EnemyGUI) => {
				this.EnemyGUIComponent[eid] = params;
			},
		);

		observe(
			this.world,
			onSet(this.EnemySprite),
			(eid: EntityId, params: Mesh) => {
				this.EnemySprite[eid] = params;
			},
		);
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
