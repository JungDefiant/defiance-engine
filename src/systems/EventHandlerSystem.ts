import { singleton } from "tsyringe";
import { Engine } from "@babylonjs/core";
import { getPublicRoot } from "src/Utils";
import ISystem from "./ISystem";


@singleton()
export default class SessionDataSystem implements ISystem {
	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number): void {}
}