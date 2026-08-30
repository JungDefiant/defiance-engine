import "reflect-metadata";
import { container } from "tsyringe";
import { gotoMainMenu, createNewEngine } from "./modules/InitModule";
import MainMenuScene from "./scenes/MainMenuScene";
import { Engine } from "@babylonjs/core";

// Source - https://stackoverflow.com/a/77970818
// Posted by Helto, modified by community. See post 'Timeline' for change history
// Retrieved 2026-06-12, License - CC BY-SA 4.0
window.addEventListener("vite:preloadError", () => {
	window.location.reload();
});

const engine = createNewEngine();
container.register(Engine, { useValue: engine });

const mainMenuScene = new MainMenuScene(engine);
container.register(MainMenuScene, { useValue: mainMenuScene });

Promise.resolve(gotoMainMenu());
