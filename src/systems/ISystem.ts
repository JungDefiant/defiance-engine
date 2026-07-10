import { Engine } from "@babylonjs/core";
import GameState from "src/states/GameState";

export default interface ISystem {
	start(engine: Engine): Promise<void>;
	update(deltaTime: number, gameState?: GameState): void;
}
