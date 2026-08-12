import { Engine } from "@babylonjs/core";

export default interface GameSystem {
	start(engine: Engine): Promise<void>;
	update(deltaTime: number): void;
}
