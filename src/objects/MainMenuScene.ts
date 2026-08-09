import {
	Engine,
	Scene,
	SceneOptions,
	UniversalCamera,
	Vector3,
} from "@babylonjs/core";
import { MainMenuScreen } from "src/gui/screens/MainMenuScreen";

export default class MainMenuScene extends Scene {
	public constructor(engine: Engine, options?: SceneOptions) {
		super(engine, options);
		this.autoClear = false;

		this.createMainMenuGUICamera();
		this.createMainMenuScreen();
	}

	private createMainMenuGUICamera() {
		new UniversalCamera("cam_gui_mainmenu", Vector3.Zero(), this);
	}

	private createMainMenuScreen() {
		new MainMenuScreen(this);
	}

	public dispose() {
		this.dispose();
	}
}
