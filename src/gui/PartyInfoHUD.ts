import { Nullable } from "@babylonjs/core";
import { Container, Control, Rectangle, StackPanel } from "@babylonjs/gui";
import IHUD from "src/gui/IHUD";
import { Themes } from "src/gui/Themes";
import { container } from "tsyringe";
import GameState from "src/GameState";

export default class PartyInfoHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private partyInfoEntryStack: Nullable<StackPanel> = null;

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show ? true : false;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_partyInfoHud");
		this.rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		this.rootContainer.width = 1;
		this.rootContainer.heightInPixels = 300;
		this.rootContainer.topInPixels = -50;

		const background = new Rectangle("ui_partyInfoHudBg");
		background.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		background.background = Themes.primary3;
		background.color = Themes.primary1;
		background.thickness = 2;
		background.width = 1;
		background.heightInPixels = 110;
		this.rootContainer.addControl(background);

		return this.rootContainer;
	}

	public setPartyInfoEntryStack() {
		if (!this.rootContainer) {
			return;
		}

		const gameState = container.resolve(GameState);
		this.partyInfoEntryStack = new StackPanel("ui_partyInfoEntryStack");
		this.partyInfoEntryStack.isVertical = false;
		this.partyInfoEntryStack.spacing = 16;
		this.partyInfoEntryStack.topInPixels = -4;

		for (const entry of gameState.PlayerGUIComponent) {
			if (!entry) {
				continue;
			}
			this.partyInfoEntryStack.addControl(entry.getRoot());
		}

		this.rootContainer.addControl(this.partyInfoEntryStack);
	}

	public setPartyInfoSwitches() {
		if (!this.rootContainer) {
			return;
		}
	}
}
