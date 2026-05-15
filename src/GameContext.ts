import { Mesh, Scene, SolidParticleSystem } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import { EntityId, observe, onGet, onSet, World } from "bitecs";
import { singleton } from "tsyringe";
import { ActorData } from "src/components/ActorData";
import { EnemyGUI } from "src/components/EnemyGUI";
import { PlayerGUI } from "src/components/PlayerGUI";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import CombatHUD from "src/gui/CombatHUD";

@singleton()
export default class GameContext {
	public readonly campaignId: string;
	public readonly selectedPlayerEID: number;
	public readonly playerEIDs: number[];
	public readonly gameMode: GameMode;
	public readonly world: World;
	public readonly scene: Scene;
	public readonly sceneData: SceneData;
	public readonly uiScene: Scene;
	public readonly locationData: LocationData;
	public readonly mainUI: AdvancedDynamicTexture;
	public readonly insceneLocationGUI: AdvancedDynamicTexture;
	public readonly insceneCombatGUI: AdvancedDynamicTexture;
	public readonly partyInfoHud: PartyInfoHUD;
	public readonly exploreHud: ExploreHUD;
	public readonly dialogueHud: DialogueHUD;
	public readonly combatHud: CombatHUD;

	public readonly ActorDataComponent: ActorData[] = [];
	public readonly PlayerGUIComponent: PlayerGUI[] = [];
	public readonly EnemyGUIComponent: EnemyGUI[] = [];
	public readonly EnemySprite: Mesh[] = [];
	public readonly FloatingText: TextBlock[] = [];
	public readonly SpecialFX: SolidParticleSystem[] = [];

	public constructor(
		campaignId: string,
		selectedPlayerEID: number,
		playerEIDs: number[],
		gameMode: GameMode,
		world: World,
		scene: Scene,
		uiScene: Scene,
		sceneData: SceneData,
		locationData: LocationData,
		mainUI: AdvancedDynamicTexture,
		locationGUI: AdvancedDynamicTexture,
		combatGUI: AdvancedDynamicTexture,
		partyInfoHud: PartyInfoHUD,
		exploreHud: ExploreHUD,
		dialogueHud: DialogueHUD,
		combatHud: CombatHUD,
	) {
		this.campaignId = campaignId;
		this.selectedPlayerEID = selectedPlayerEID;
		this.playerEIDs = playerEIDs;
		this.gameMode = gameMode;
		this.world = world;
		this.scene = scene;
		this.uiScene = uiScene;
		this.sceneData = sceneData;
		this.locationData = locationData;
		this.mainUI = mainUI;
		this.insceneLocationGUI = locationGUI;
		this.insceneCombatGUI = combatGUI;
		this.partyInfoHud = partyInfoHud;
		this.exploreHud = exploreHud;
		this.dialogueHud = dialogueHud;
		this.combatHud = combatHud;

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

		observe(
			this.world,
			onSet(this.EnemySprite),
			(eid: EntityId, params: Mesh) => {
				this.EnemySprite[eid] = params;
			},
		);

		observe(this.world, onGet(this.EnemySprite), (eid: EntityId) => {
			return this.EnemySprite[eid];
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
