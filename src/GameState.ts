import {
	ActionManager,
	Mesh,
	Nullable,
	Scene,
	SolidParticleSystem,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import { EntityId, observe, onGet, onRemove, onSet } from "bitecs";
import type { World } from "bitecs";
import { singleton } from "tsyringe";
import { ActorData } from "src/components/ActorData";
import { EnemyGUI } from "src/gui/components/EnemyGUI";
import { PlayerGUI } from "src/gui/components/PlayerGUI";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import CombatHUD from "src/gui/CombatHUD";
import { DEFAULT_CAM_TARGET } from "./Constants";
import { GameOverScreen } from "./gui/screens/GameOverScreen";
import { TacticalPauseScreen } from "./gui/screens/TacticalPauseScreen";

/*
TO DO:
- Break up into smaller classes
- Figure out what variables need to be immutable/mutable and private/public.
*/
@singleton()
export default class GameState {
	public readonly campaignId: string;
	public gamePaused: boolean = false;
	public actionPauseSet: Set<string> = new Set();
	public renderPauseSet: Set<string> = new Set();
	public playerEIDs: number[];
	public enemyEIDs: number[] = [];
	public lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	public gameMode: GameMode;
	public selectedPlayerEID: number;
	public actionManager: Nullable<ActionManager> = null;
	// Game configurations
	public controlSettings: ControlSettings = new ControlSettings();
	// Scene data
	public readonly world: World;
	public readonly scene: Scene;
	public readonly sceneData: SceneData;
	public readonly uiScene: Scene;
	public readonly sceneNodes: TransformNode[];
	public locationData: Nullable<LocationData> = null;
	// GUIs
	public readonly mainUI: AdvancedDynamicTexture;
	public readonly sceneGUI: AdvancedDynamicTexture;
	// HUDs
	public readonly partyInfoHud: PartyInfoHUD;
	public readonly exploreHud: ExploreHUD;
	public readonly dialogueHud: DialogueHUD;
	public readonly combatHud: CombatHUD;
	// Screens
	public readonly gameOverScreen: GameOverScreen;
	public readonly tacticalPauseScreen: TacticalPauseScreen;
	// Components
	public readonly ActorDataComponent: ActorData[] = [];
	public readonly PlayerGUIComponent: PlayerGUI[] = [];
	public readonly EnemyGUIComponent: EnemyGUI[] = [];
	public readonly CharacterSprite: Mesh[] = [];
	public readonly FloatingText: TextBlock[] = [];
	public readonly SpecialFX: SolidParticleSystem[] = [];

	public constructor(
		campaignId: string,
		gameMode: GameMode,
		selectedPlayerEID: number,
		playerEIDs: number[],
		world: World,
		scene: Scene,
		uiScene: Scene,
		sceneData: SceneData,
		sceneNodes: TransformNode[],
		mainUI: AdvancedDynamicTexture,
		sceneGUI: AdvancedDynamicTexture,
		partyInfoHud: PartyInfoHUD,
		exploreHud: ExploreHUD,
		dialogueHud: DialogueHUD,
		combatHud: CombatHUD,
		gameOverScreen: GameOverScreen,
		tacticalPauseScreen: TacticalPauseScreen,
	) {
		this.campaignId = campaignId;
		this.gameMode = gameMode;
		this.selectedPlayerEID = selectedPlayerEID;
		this.playerEIDs = playerEIDs;
		this.world = world;
		this.scene = scene;
		this.uiScene = uiScene;
		this.sceneData = sceneData;
		this.sceneNodes = sceneNodes;
		this.mainUI = mainUI;
		this.sceneGUI = sceneGUI;
		this.partyInfoHud = partyInfoHud;
		this.exploreHud = exploreHud;
		this.dialogueHud = dialogueHud;
		this.combatHud = combatHud;
		this.gameOverScreen = gameOverScreen;
		this.tacticalPauseScreen = tacticalPauseScreen;

		this.initComponentObservables();
	}

	private initComponentObservables() {
		observe(
			this.world,
			onSet(this.ActorDataComponent),
			(eid: EntityId, params: ActorData) => {
				this.ActorDataComponent[eid] = params;
			},
		);

		observe(this.world, onGet(this.ActorDataComponent), (eid: EntityId) => {
			return this.ActorDataComponent[eid];
		});

		observe(
			this.world,
			onSet(this.PlayerGUIComponent),
			(eid: EntityId, params: PlayerGUI) => {
				this.PlayerGUIComponent[eid] = params;
			},
		);

		observe(this.world, onGet(this.PlayerGUIComponent), (eid: EntityId) => {
			return this.PlayerGUIComponent[eid];
		});

		observe(this.world, onRemove(this.PlayerGUIComponent), (eid: EntityId) => {
			this.PlayerGUIComponent[eid].getRoot().dispose();
		});

		observe(
			this.world,
			onSet(this.EnemyGUIComponent),
			(eid: EntityId, params: EnemyGUI) => {
				this.EnemyGUIComponent[eid] = params;
			},
		);

		observe(this.world, onGet(this.EnemyGUIComponent), (eid: EntityId) => {
			return this.EnemyGUIComponent[eid];
		});

		observe(this.world, onRemove(this.EnemyGUIComponent), (eid: EntityId) => {
			this.EnemyGUIComponent[eid].getRoot().dispose();
		});

		observe(
			this.world,
			onSet(this.CharacterSprite),
			(eid: EntityId, params: Mesh) => {
				this.CharacterSprite[eid] = params;
			},
		);

		observe(this.world, onGet(this.CharacterSprite), (eid: EntityId) => {
			return this.CharacterSprite[eid];
		});

		observe(this.world, onRemove(this.CharacterSprite), (eid: EntityId) => {
			this.CharacterSprite[eid].dispose();
		});

		observe(
			this.world,
			onSet(this.FloatingText),
			(eid: EntityId, params: TextBlock) => {
				this.FloatingText[eid] = params;
			},
		);

		observe(this.world, onGet(this.FloatingText), (eid: EntityId) => {
			return this.FloatingText[eid];
		});

		observe(this.world, onRemove(this.FloatingText), (eid: EntityId) => {
			this.FloatingText[eid].dispose();
		});

		observe(
			this.world,
			onSet(this.SpecialFX),
			(eid: EntityId, params: SolidParticleSystem) => {
				this.SpecialFX[eid] = params;
			},
		);

		observe(this.world, onGet(this.SpecialFX), (eid: EntityId) => {
			return this.SpecialFX[eid];
		});

		observe(this.world, onRemove(this.SpecialFX), (eid: EntityId) => {
			this.SpecialFX[eid].dispose();
		});
	}
}

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
