import {
	ActionManager,
	Mesh,
	Nullable,
	Scene,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import {
	AdvancedDynamicTexture,
	Control,
	TextBlock,
	Image,
} from "@babylonjs/gui";
import { EntityId, observe, onGet, onRemove, onSet } from "bitecs";
import type { World } from "bitecs";
import { singleton } from "tsyringe";
import { ActorState } from "src/components/ActorState";
import { EnemyGUI } from "src/gui/components/EnemyGUI";
import { PlayerGUI } from "src/gui/components/PlayerGUI";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import CombatHUD from "src/gui/CombatHUD";
import { DEFAULT_CAM_TARGET } from "../Constants";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import {
	ControlSettings,
	GameMode,
	LocationData,
} from "src/states/types/GameTypes";
import type {
	DialogueNode,
	ModalData,
	SceneData,
	StoryVariable,
} from "src/states/types/GameTypes";
import { VictoryScreen } from "../gui/screens/VictoryScreen";
import { ModalScreen } from "../gui/screens/ModalScreen";
import { DialogueSemantics } from "src/parser/DialogueParser.ohm-bundle";
import { CombatState } from "src/systems/CombatManagerSystem";
import { ImageAnimation as ImageAnimation } from "src/components/ImageAnimation";

/*
TO DO:
- Break up into smaller classes
- Figure out what variables need to be immutable/mutable and private/public.
*/
@singleton()
export default class GameState {
	// Campaign State
	public readonly campaignId: string;
	public readonly storyVariableMap: Map<string, StoryVariable> = new Map();
	// Gameplay state
	public gameMode: GameMode;
	public playerEIDs: number[];
	public selectedPlayerEID: number;
	public enemyEIDs: number[] = [];
	public lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	public currentLocation: Nullable<LocationData> = null;
	public combatState: CombatState = CombatState.Default;
	// Dialogue state
	public semantics: Nullable<DialogueSemantics> = null;
	public activeDialogue: Nullable<DialogueNode> = null;
	public readonly dialogueMap: Map<string, DialogueNode> = new Map();
	// Control state
	public actionManager: Nullable<ActionManager> = null;
	public exploreGUIControls: Control[] = [];
	public readonly controlSettings: ControlSettings = new ControlSettings();
	public readonly actionPauseSet: Set<string> = new Set();
	public readonly renderPauseSet: Set<string> = new Set();
	public readonly controlPauseSet: Set<string> = new Set();
	// Scene state
	public readonly world: World;
	public readonly scene: Scene;
	public readonly sceneData: SceneData;
	public readonly uiScene: Scene;
	public readonly sceneNodes: TransformNode[];
	// GUI state
	public readonly mainUI: AdvancedDynamicTexture;
	public readonly sceneGUI: AdvancedDynamicTexture;
	public readonly modalMap: Map<string, ModalData> = new Map();
	public readonly partyInfoHud: PartyInfoHUD;
	public readonly exploreHud: ExploreHUD;
	public readonly dialogueHud: DialogueHUD;
	public readonly combatHud: CombatHUD;
	public readonly tacticalPauseScreen: TacticalPauseScreen;
	public readonly modalScreen: ModalScreen;
	public readonly gameOverScreen: GameOverScreen;
	public readonly victoryScreen: VictoryScreen;
	// Components state
	public readonly ActorState: ActorState[] = [];
	public readonly PlayerGUIComponent: PlayerGUI[] = [];
	public readonly EnemyGUIComponent: EnemyGUI[] = [];
	public readonly CharacterSprite: Mesh[] = [];
	public readonly FloatingText: TextBlock[] = [];
	public readonly StickerImage: Image[] = [];
	public readonly ImageAnimation: ImageAnimation[] = [];

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
			onSet(this.ActorState),
			(eid: EntityId, params: ActorState) => {
				this.ActorState[eid] = params;
			},
		);

		observe(this.world, onGet(this.ActorState), (eid: EntityId) => {
			return this.ActorState[eid];
		});

		observe(this.world, onRemove(this.ActorState), (eid: EntityId) => {
			this.ActorState.splice(eid);
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

		observe(
			this.world,
			onRemove(this.PlayerGUIComponent),
			(eid: EntityId) => {
				this.PlayerGUIComponent[eid].getRoot().dispose();
				this.PlayerGUIComponent.splice(eid);
			},
		);

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

		observe(
			this.world,
			onRemove(this.EnemyGUIComponent),
			(eid: EntityId) => {
				this.EnemyGUIComponent[eid].getRoot().dispose();
				this.EnemyGUIComponent.splice(eid);
			},
		);

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

		// Sticker Image
		observe(
			this.world,
			onSet(this.StickerImage),
			(eid: EntityId, params: Image) => {
				this.StickerImage[eid] = params;
			},
		);

		observe(this.world, onGet(this.StickerImage), (eid: EntityId) => {
			return this.StickerImage[eid];
		});

		observe(this.world, onRemove(this.StickerImage), (eid: EntityId) => {
			this.StickerImage[eid].dispose();
			this.StickerImage.splice(eid);
		});

		// Image Animation
		observe(
			this.world,
			onSet(this.ImageAnimation),
			(eid: EntityId, params: ImageAnimation) => {
				this.ImageAnimation[eid] = params;
			},
		);

		observe(this.world, onGet(this.ImageAnimation), (eid: EntityId) => {
			return this.ImageAnimation[eid];
		});

		observe(this.world, onRemove(this.ImageAnimation), (eid: EntityId) => {
			this.ImageAnimation.splice(eid);
		});
	}
}
