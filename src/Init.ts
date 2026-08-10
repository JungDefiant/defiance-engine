import "reflect-metadata";
import { container } from "tsyringe";
import { App } from "src/App";
import { SystemRegistry } from "./registries/SystemRegistry";
import { GameStateRegistry } from "./registries/GameStateRegistry";
import { FactoryRegistry } from "./registries/FactoryRegistry";
import { registerNewEngine } from "./helpers/InitHelpers";
import MainMenuScene from "./objects/MainMenuScene";

// Source - https://stackoverflow.com/a/77970818
// Posted by Helto, modified by community. See post 'Timeline' for change history
// Retrieved 2026-06-12, License - CC BY-SA 4.0
window.addEventListener("vite:preloadError", () => {
	window.location.reload();
});

container.resolve(SystemRegistry);
container.resolve(FactoryRegistry);
container.resolve(GameStateRegistry);

const app = new App();

const engine = registerNewEngine();
const mainMenuScene = new MainMenuScene(engine);
app.mainMenuScene = mainMenuScene;
app.gotoMainMenu();
