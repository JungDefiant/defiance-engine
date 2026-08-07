import "reflect-metadata";
import { container } from "tsyringe";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import UserInterfaceSystem from "src/systems/UserInterfaceSystem";
import DialogueManagerSystem from "src/systems/DialogueManagerSystem";
import CombatManagerSystem from "src/systems/CombatManagerSystem";
import ActorStateSystem from "src/systems/ActorStateSystem";
import { PlayerFactory } from "src/factories/PlayerFactory";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { App } from "src/App";
import RenderQueueSystem from "src/systems/RenderQueueSystem";
import EventHandlerSystem from "./systems/EventHandlerSystem";
import ImageAnimationSystem from "./systems/ImageAnimationSystem";
import EntityMovementSystem from "./systems/EntityMovementSystem";
import { SystemRegistry } from "./states/registries/SystemRegistry";

// Source - https://stackoverflow.com/a/77970818
// Posted by Helto, modified by community. See post 'Timeline' for change history
// Retrieved 2026-06-12, License - CC BY-SA 4.0
window.addEventListener("vite:preloadError", () => {
	window.location.reload();
});

const systemRegistry = container.resolve(SystemRegistry);
// systemRegistry.registerNewGameSystem()
const sceneManagerSystem = container.resolve(SceneManagerSystem);
const userInterfaceSystem = container.resolve(UserInterfaceSystem);
const dialogueManagerSystem = container.resolve(DialogueManagerSystem);
const combatManagerSystem = container.resolve(CombatManagerSystem);
const actorStateSystem = container.resolve(ActorStateSystem);
const entityMovementSystem = container.resolve(EntityMovementSystem);
const eventHandlerSystem = container.resolve(EventHandlerSystem);
const renderQueueSystem = container.resolve(RenderQueueSystem);
const imageAnimationSystem = container.resolve(ImageAnimationSystem);
const playerFactory = container.resolve(PlayerFactory);
const enemyFactory = container.resolve(EnemyFactory);

const app = new App(
	sceneManagerSystem,
	userInterfaceSystem,
	renderQueueSystem,
	imageAnimationSystem,
	dialogueManagerSystem,
	combatManagerSystem,
	entityMovementSystem,
	actorStateSystem,
	eventHandlerSystem,
	playerFactory,
	enemyFactory,
);
app.gotoMainMenu();
