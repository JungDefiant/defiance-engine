import { Engine } from "@babylonjs/core";

export default interface GameSystem {
	update(deltaTime: number): void;
}
