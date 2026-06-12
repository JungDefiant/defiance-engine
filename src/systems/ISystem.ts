import { Engine } from "@babylonjs/core";
import GameState from "src/GameState";

export default interface ISystem {
	start(engine: Engine): Promise<void>;
	update(deltaTime: number, gameState?: GameState): void;
}
