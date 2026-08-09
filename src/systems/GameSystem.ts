import { Engine } from "@babylonjs/core";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";

export default interface GameSystem {
	start(engine: Engine): Promise<void>;
	update(deltaTime: number): void;
}
