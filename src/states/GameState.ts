import {
	ActionManager,
	Mesh,
	Nullable,
	Scene,
	SolidParticleSystem,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, TextBlock } from "@babylonjs/gui";
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
import { DEFAULT_CAM_TARGET } from "../Constants";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import { ControlSettings, GameMode, LocationData } from "src/states/data/GameData";
import type { DialogueNode, ModalData, SceneData } from "src/states/data/GameData";
import { VictoryScreen } from "../gui/screens/VictoryScreen";
import { ModalScreen } from "../gui/screens/ModalScreen";
import { DialogueSemantics } from "src/parser/DialogueParser.ohm-bundle";

/*
TO DO:
- Break up into smaller classes
- Figure out what variables need to be immutable/mutable and private/public.
*/
@singleton()
export default class GameState {
	public readonly campaignId: string;
	public gamePaused: boolean = false;
	public playerEIDs: number[];
	public enemyEIDs: number[] = [];
	public lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	public gameMode: GameMode;
	public selectedPlayerEID: number;
	public activeDialogue: Nullable<DialogueNode> = null;
	public currentLocation: Nullable<LocationData> = null;
	public actionManager: Nullable<ActionManager> = null;
	public exploreGUIControls: Control[] = [];
	public actionPauseSet: Set<string> = new Set();
	public renderPauseSet: Set<string> = new Set();
	public controlPauseSet: Set<string> = new Set();
	// Game configurations
	public controlSettings: ControlSettings = new ControlSettings();
	public semantics: Nullable<DialogueSemantics> = null;
	// Scene data
	public readonly world: World;
	public readonly scene: Scene;
	public readonly sceneData: SceneData;
	public readonly uiScene: Scene;
	public readonly sceneNodes: TransformNode[];
	public readonly dialogueMap: Map<string, DialogueNode> = new Map();
	public readonly modalMap: Map<string, ModalData> = new Map();
	// GUIs
	public readonly mainUI: AdvancedDynamicTexture;
	public readonly sceneGUI: AdvancedDynamicTexture;
	// HUDs
	public readonly partyInfoHud: PartyInfoHUD;
	public readonly exploreHud: ExploreHUD;
	public readonly dialogueHud: DialogueHUD;
	public readonly combatHud: CombatHUD;
	// Screens
	public readonly tacticalPauseScreen: TacticalPauseScreen;
	public readonly modalScreen: ModalScreen;
	public readonly gameOverScreen: GameOverScreen;
	public readonly victoryScreen: VictoryScreen;
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
		tacticalPauseScreen: TacticalPauseScreen,
		modalScreen: ModalScreen,
		gameOverScreen: GameOverScreen,
		victoryScreen: VictoryScreen,
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
		this.tacticalPauseScreen = tacticalPauseScreen;
		this.modalScreen = modalScreen;
		this.gameOverScreen = gameOverScreen;
		this.victoryScreen = victoryScreen;

		this.initComponentObservables();
	}

	private initComponentObservables() {
		// Actor Data Component
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

		observe(this.world, onRemove(this.ActorDataComponent), (eid: EntityId) => {
			this.ActorDataComponent.splice(eid);
		});

		// Player GUI Component
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
			this.PlayerGUIComponent.splice(eid);
		});

		// Enemy GUI Component
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
			this.EnemyGUIComponent.splice(eid);
		});

		// Character Sprite
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
			this.CharacterSprite.splice(eid);
		});

		// Floating Text
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
			this.FloatingText.splice(eid);
		});

		// Special FX
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
			this.SpecialFX.splice(eid);
		});
	}
}
