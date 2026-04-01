import { Engine } from "@babylonjs/core";

export default interface ISystem {
	start(engine: Engine): Promise<void>;
	update(deltaTime: number): void;
}
