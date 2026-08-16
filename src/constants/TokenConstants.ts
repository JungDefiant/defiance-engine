import CombatManagerSystem from "../systems/CombatManagerSystem";
import EntityMovementSystem from "../systems/EntityMovementSystem";
import ImageAnimationSystem from "../systems/ImageAnimationSystem";
import RenderQueueSystem from "../systems/RenderQueueSystem";
import ActorStateSystem from "../systems/ActorStateSystem";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { StickerFactory } from "src/factories/StickerFactory";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import AudioState from "src/states/AudioState";
import ControlState from "src/states/ControlState";
import DialogueState from "src/states/DialogueState";
import GameplayState from "src/states/GameplayState";
import UserInterfaceState from "src/states/UserInterfaceState";
import ActorStateComponent from "src/components/ActorStateComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import EntityMovementComponent from "src/components/EntityMovementComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import TransformNodeComponent from "src/components/TransformNodeComponent";
import RenderState from "src/states/RenderState";

export const SYSTEM_TOKENS = [
	ActorStateSystem,
	CombatManagerSystem,
	EntityMovementSystem,
	ImageAnimationSystem,
	RenderQueueSystem,
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
	ControlState,
	DialogueState,
	GameplayState,
	RenderState,
];
