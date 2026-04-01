import { Nullable } from "@babylonjs/core";
import { Container, Control, Rectangle, StackPanel } from "@babylonjs/gui";
import IHUD from "./IHUD";
import { Themes } from "./Themes";
import { PlayerGUI } from "../components/PlayerGUI";
import { container } from "tsyringe";
import GameContext from "../GameContext";
import { query } from "bitecs";

export default class PartyInfoHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private partyInfoEntries: Nullable<PlayerGUI[]> = null;

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show ? true : false;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_partyInfoHud");
		this.rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.rootContainer.widthInPixels = 800;
		this.rootContainer.heightInPixels = 300;
		this.rootContainer.topInPixels = -52;

		const background = new Rectangle("ui_partyInfoHudBg");
		background.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		background.background = Themes.primary3;
		background.color = Themes.primary1;
		background.thickness = 2;
		background.widthInPixels = 800;
		background.heightInPixels = 110;
		this.rootContainer.addControl(background);

		const partyInfoEntryStack = new StackPanel("ui_partyInfoEntryStack");
		partyInfoEntryStack.isVertical = false;
		partyInfoEntryStack.spacing = 16;

		const context = container.resolve(GameContext);

		console.log(context.PlayerGUIComponent);
		console.log(context.PlayerGUIComponent.length);

		for (const entry of context.PlayerGUIComponent) {
			if (!entry) {
				continue;
			}
			partyInfoEntryStack.addControl(entry.getRootContainer());
			console.log(entry);
		}

		this.rootContainer.addControl(partyInfoEntryStack);

		return this.rootContainer;
	}
}
