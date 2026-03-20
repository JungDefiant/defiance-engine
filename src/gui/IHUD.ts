import { Nullable } from "@babylonjs/core";
import { Container } from "@babylonjs/gui";

export default interface IHUD {
	rootContainer: Nullable<Container>;
	createHudRoot(): Container;
	showHideHud(show: boolean): void;
}
