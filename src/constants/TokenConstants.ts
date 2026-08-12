import CombatManagerSystem from "../systems/CombatManagerSystem";
import DialogueManagerSystem from "../systems/DialogueManagerSystem";
import EntityMovementSystem from "../systems/EntityMovementSystem";
import EventHandlerSystem from "../systems/EventHandlerSystem";
import ImageAnimationSystem from "../systems/ImageAnimationSystem";
import RenderQueueSystem from "../systems/RenderQueueSystem";
import SceneManagerSystem from "../systems/SceneManagerSystem";
import ActorStateSystem from "../systems/ActorStateSystem";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { StickerFactory } from "src/factories/StickerFactory";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import AudioState from "src/states/AudioState";
import CampaignState from "src/states/CampaignState";
import ControlState from "src/states/ControlState";
import DialogueState from "src/states/DialogueState";
import GameplayState from "src/states/GameplayState";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";
import ActorStateComponent from "src/components/ActorStateComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import EntityMovementComponent from "src/components/EntityMovementComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import TransformNodeComponent from "src/components/TransformNodeComponent";

export const SYSTEM_TOKENS = [
	ActorStateSystem,
	CombatManagerSystem,
	DialogueManagerSystem,
	EntityMovementSystem,
	EventHandlerSystem,
	ImageAnimationSystem,
	RenderQueueSystem,
	SceneManagerSystem,
];

export const FACTORY_TOKENS = [EnemyFactory, PlayerFactory, StickerFactory];

export const COMPONENT_TOKENS = [
	ActorStateComponent,
	CharacterSpriteComponent,
	EnemyGUIComponent,
	EntityMovementComponent,
	FloatingTextComponent,
	ImageAnimationComponent,
	PlayerGUIComponent,
	StickerImageComponent,
	TransformNodeComponent,
];

export const STATE_TOKENS = [
	AudioState,
	CampaignState,
	ControlState,
	DialogueState,
	GameplayState,
	SceneState,
	UserInterfaceState,
];
