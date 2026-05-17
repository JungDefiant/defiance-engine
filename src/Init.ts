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

const smSystem = container.resolve(SceneManagerSystem);
const uiSystem = container.resolve(UserInterfaceSystem);
const dmSystem = container.resolve(DialogueManagerSystem);
const cmSystem = container.resolve(CombatManagerSystem);
const asSystem = container.resolve(ActorStateSystem);
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
	plyrFactory,
	enFactory,
);
app.run();
