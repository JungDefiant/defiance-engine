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

	private partyInfoEntryStack: Nullable<StackPanel> = null;

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

		return this.rootContainer;
	}

	public setPartyInfoEntryStack() {
		if (!this.rootContainer) {
			return;
		}

		const context = container.resolve(GameContext);
		this.partyInfoEntryStack = new StackPanel("ui_partyInfoEntryStack");
		this.partyInfoEntryStack.isVertical = false;
		this.partyInfoEntryStack.spacing = 16;

		for (const entry of context.PlayerGUIComponent) {
			if (!entry) {
				continue;
			}
			this.partyInfoEntryStack.addControl(entry.getRootContainer());
		}

		this.rootContainer.addControl(this.partyInfoEntryStack);
	}
}
