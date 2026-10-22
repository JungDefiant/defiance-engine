import CombatManagerSystem from "../systems/CombatManagerSystem";
import EntityMovementSystem from "../systems/EntityMovementSystem";
import ImageAnimationSystem from "../systems/ImageAnimationSystem";
import RenderQueueSystem from "../systems/RenderQueueSystem";
import ActorStateSystem from "../systems/ActorStateSystem";
import ActorNavigationSystem from "../systems/ActorNavigationSystem";
import ActorBehaviorSystem from "../systems/ActorBehaviorSystem";
import Collision3DSystem from "../systems/Collision3DSystem";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { StickerFactory } from "src/factories/StickerFactory";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import ControlState from "src/states/ControlState";
import DialogueState from "src/states/DialogueState";
import GameplayState from "src/states/GameplayState";
import ActorStateComponent from "src/components/ActorStateComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import EntityMovementComponent from "src/components/EntityMovementComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import TransformNodeComponent from "src/components/TransformNodeComponent";
import RenderState from "src/states/RenderState";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import CollisionComponent from "src/components/CollisionComponent";
import { GameEventProcessor } from "src/processors/GameEventProcessor";
import { AbilityEffectApplicationProcessor } from "src/processors/AbilityEffectApplicationProcessor";
import { AbilityEffectCalculationProcessor } from "src/processors/AbilityEffectCalculationProcessor";

// The order of system tokens matter; determine order that systems are run
export const SYSTEM_TOKENS = [
	EntityMovementSystem,
	ActorNavigationSystem,
	CombatManagerSystem,
	ActorBehaviorSystem,
	ActorStateSystem,
	UserInterfaceSystem,
	ImageAnimationSystem,
	RenderQueueSystem,
	Collision3DSystem,
];

export const FACTORY_TOKENS = [EnemyFactory, PlayerFactory, StickerFactory];

export const PROCESSOR_TOKENS = [
	AbilityEffectApplicationProcessor,
	AbilityEffectCalculationProcessor,
	GameEventProcessor,
];

export const COMPONENT_TOKENS = [
	ActorBehaviorComponent,
	ActorNavigationComponent,
	ActorStateComponent,
	CharacterSpriteComponent,
	CollisionComponent,
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
