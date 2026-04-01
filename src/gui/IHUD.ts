import { Nullable } from "@babylonjs/core";
import { Container } from "@babylonjs/gui";
import GameContext from "../GameContext";

export default interface IHUD {
	rootContainer: Nullable<Container>;
	createHudRoot(): Container;
	showHideHud(show: boolean): void;
}
