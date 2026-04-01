import { container, singleton } from "tsyringe";
import ISystem from "./ISystem";
import { Engine, Nullable, Scene } from "@babylonjs/core";
import GameContext, { GameMode } from "../GameContext";

export interface IUserInterfaceSystem extends ISystem {
	setGameMode(newMode: GameMode): void;
	createPlayerInput(inputMode: GameMode): void;
}

@singleton()
export default class UserInterfaceSystem implements IUserInterfaceSystem {
	public uiScene: Nullable<Scene> = null;

	public async start(engine: Engine) {}

	public update() {}

	public setGameMode(newMode: GameMode) {
		const context = container.resolve(GameContext);
		context.partyInfoHud.showHideHud(
			newMode == GameMode.Combat || newMode == GameMode.Explore,
		);
		context.exploreHud.showHideHud(newMode == GameMode.Explore);
		context.dialogueHud.showHideHud(newMode == GameMode.Dialogue);
		context.combatHud.showHideHud(newMode == GameMode.Combat);
	}

	public createPlayerInput(inputMode: GameMode) {}
}
