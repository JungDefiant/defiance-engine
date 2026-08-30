import { Engine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { MainMenuScreen } from "src/gui/screens/MainMenuScreen";
import { singleton } from "tsyringe";
import type { Nullable, SceneOptions } from "@babylonjs/core";
import AudioState from "src/states/AudioState";

@singleton()
export default class MainMenuScene extends Scene {
	private _audioState: Nullable<AudioState> = null;

	private readonly mainMenuScreen: MainMenuScreen;

	public constructor(engine: Engine, options?: SceneOptions) {
		super(engine, options);
		this.autoClear = false;

		new UniversalCamera("cam_gui_mainmenu", Vector3.Zero(), this);
		this.mainMenuScreen = new MainMenuScreen(this);
	}

	public get audioState(): Nullable<AudioState> {
		return this._audioState;
	}
	public set audioState(value: Nullable<AudioState>) {
		this._audioState = value;
	}
}
