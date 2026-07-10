import { Nullable } from "@babylonjs/core";
import { Container } from "@babylonjs/gui";
import GameState from "../states/GameState";

export default interface IHUD {
	rootContainer: Nullable<Container>;
	createHudRoot(): Container;
	showHideHud(show: boolean): void;
}
