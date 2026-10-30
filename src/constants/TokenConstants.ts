import { EnemyFactory } from "src/factories/EnemyFactory";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { StickerFactory } from "src/factories/StickerFactory";
import { ImageAnimationComponent } from "src/components/ImageAnimationComponent";
import { GameEventProcessor } from "src/processors/GameEventProcessor";
import { AbilityEffectApplicationProcessor } from "src/processors/AbilityEffectApplicationProcessor";
import { AbilityEffectCalculationProcessor } from "src/processors/AbilityEffectCalculationProcessor";
import { ProjectileFactory } from "src/factories/ProjectileFactory";
import { RenderQueueFactory } from "src/factories/RenderQueueFactory";
import ControlState from "src/states/ControlState";
import DialogueState from "src/states/DialogueState";
import GameplayState from "src/states/GameplayState";
import ActorStateComponent from "src/components/ActorStateComponent";
import CharacterSpriteComponent from "src/components/CharacterSpriteComponent";
import EnemyGUIComponent from "src/components/EnemyGUIComponent";
import FloatingTextComponent from "src/components/FloatingTextComponent";
import PlayerGUIComponent from "src/components/PlayerGUIComponent";
import StickerImageComponent from "src/components/StickerImageComponent";
import TransformNodeComponent from "src/components/TransformNodeComponent";
import RenderState from "src/states/RenderState";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import ActorBehaviorComponent from "src/components/ActorBehaviorComponent";
import ActorNavigationComponent from "src/components/ActorNavigationComponent";
import CollisionComponent from "src/components/CollisionComponent";
import NavigationState from "src/states/NavigationState";
import ProjectileSystem from "src/systems/ProjectileSystem";
import ProjectileComponent from "src/components/ProjectileComponent";
import RenderQueueComponent from "src/components/RenderQueueComponent";
import PartyFollowSystem from "src/systems/PartyFollowSystem";
import SelectedPlayerControlSystem from "src/systems/SelectedPlayerControlSystem";
import ImageAnimationSystem from "src/systems/ImageAnimationSystem";
import RenderQueueSystem from "src/systems/RenderQueueSystem";
import ActorStateSystem from "src/systems/ActorStateSystem";
import ActorNavigationSystem from "src/systems/ActorNavigationSystem";
import ActorBehaviorSystem from "src/systems/ActorBehaviorSystem";
import Collision3DSystem from "src/systems/Collision3DSystem";
import ActionExecutionSystem from "src/systems/ActionExecutionSystem";
import { CollisionBehaviorProcessor } from "src/processors/CollisionBehaviorProcessor";
import { TargetingShapeProcessor } from "src/processors/TargetingShapeProcessor";
import { BehaviorProcessor } from "src/processors/BehaviorProcessor";

// The order of system tokens matter; determine order that systems are run
export const SYSTEM_TOKENS = [
    ActorNavigationSystem,
    ActionExecutionSystem,
    PartyFollowSystem,
    SelectedPlayerControlSystem,
    ActorBehaviorSystem,
    ActorStateSystem,
    UserInterfaceSystem,
    ImageAnimationSystem,
    RenderQueueSystem,
    ProjectileSystem,
    Collision3DSystem,
];

export const FACTORY_TOKENS = [
    EnemyFactory,
    PlayerFactory,
    StickerFactory,
    ProjectileFactory,
    RenderQueueFactory,
];

export const PROCESSOR_TOKENS = [
    AbilityEffectApplicationProcessor,
    AbilityEffectCalculationProcessor,
    GameEventProcessor,
    CollisionBehaviorProcessor,
    TargetingShapeProcessor,
    BehaviorProcessor,
];

export const COMPONENT_TOKENS = [
    ActorBehaviorComponent,
    ActorNavigationComponent,
    ActorStateComponent,
    CharacterSpriteComponent,
    CollisionComponent,
    EnemyGUIComponent,
    FloatingTextComponent,
    ImageAnimationComponent,
    PlayerGUIComponent,
    StickerImageComponent,
    TransformNodeComponent,
    ProjectileComponent,
    RenderQueueComponent,
];

export const STATE_TOKENS = [
    ControlState,
    DialogueState,
    GameplayState,
    RenderState,
    NavigationState,
];
