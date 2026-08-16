import { Engine, Scene } from "@babylonjs/core";
import { ShowInspector } from "@babylonjs/inspector";
import { singleton } from "tsyringe";
import type { SceneOptions } from "@babylonjs/core";

@singleton()
export class UserInterfaceScene extends Scene {
	public constructor(engine: Engine, options?: SceneOptions) {
		super(engine, options);
		this.autoClear = false;

		// ShowInspector(this);
	}
}
