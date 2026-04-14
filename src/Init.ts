import "reflect-metadata";
import { container } from "tsyringe";
import SceneManagerSystem from "./systems/SceneManagerSystem";
import UserInterfaceSystem from "./systems/UserInterfaceSystem";
import DialogueManagerSystem from "./systems/DialogueManagerSystem";
import CombatManagerSystem from "./systems/CombatManagerSystem";
import ActorStateSystem from "./systems/ActorStateSystem";
import { PlayerFactory } from "./factories/PlayerFactory";
import { EnemyFactory } from "./factories/EnemyFactory";
import { App } from "./App";

const smSystem = container.resolve(SceneManagerSystem);
const uiSystem = container.resolve(UserInterfaceSystem);
const dmSystem = container.resolve(DialogueManagerSystem);
const cmSystem = container.resolve(CombatManagerSystem);
const asSystem = container.resolve(ActorStateSystem);
const plyrFactory = container.resolve(PlayerFactory);
const enFactory = container.resolve(EnemyFactory);

const app = new App(
	smSystem,
	uiSystem,
	dmSystem,
	cmSystem,
	asSystem,
	plyrFactory,
	enFactory,
);
app.run();
