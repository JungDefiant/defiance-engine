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

// Source - https://stackoverflow.com/a/77970818
// Posted by Helto, modified by community. See post 'Timeline' for change history
// Retrieved 2026-06-12, License - CC BY-SA 4.0
window.addEventListener("vite:preloadError", () => {
	window.location.reload();
});

const smSystem = container.resolve(SceneManagerSystem);
const uiSystem = container.resolve(UserInterfaceSystem);
const dmSystem = container.resolve(DialogueManagerSystem);
const cmSystem = container.resolve(CombatManagerSystem);
const asSystem = container.resolve(ActorStateSystem);
const ehSystem = container.resolve(EventHandlerSystem);
const rqeSystem = container.resolve(RenderQueueSystem);
const plyrFactory = container.resolve(PlayerFactory);
const enFactory = container.resolve(EnemyFactory);

const app = new App(
	smSystem,
	uiSystem,
	rqeSystem,
	dmSystem,
	cmSystem,
	asSystem,
	ehSystem,
	plyrFactory,
	enFactory,
);
app.gotoMainMenu();
