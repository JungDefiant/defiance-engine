import { Nullable } from "@babylonjs/core";
import { Container, Control, Rectangle, StackPanel } from "@babylonjs/gui";
import IHUD from "src/gui/IHUD";
import { Themes } from "src/gui/Themes";
import { getPlayerGuiComponentArray } from "src/modules/ComponentModule";
import { getGameplayState, getGameScene } from "src/modules/GameStateModule";
import { container } from "tsyringe";

export default class PartyInfoHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private partyInfoEntryStack: Nullable<StackPanel> = null;

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show ? true : false;
	}

	public createHudRoot(): Container {
		this.rootContainer = new Container("ui_partyInfoHud");
		this.rootContainer.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_BOTTOM;
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
		background.isPointerBlocker = true;

		this.rootContainer.addControl(background);

		return this.rootContainer;
	}

	public setPartyInfoEntryStack() {
		if (!this.rootContainer) {
			return;
		}

		this.partyInfoEntryStack = new StackPanel("ui_partyInfoEntryStack");
		this.partyInfoEntryStack.isVertical = false;
		this.partyInfoEntryStack.spacing = 16;
		this.partyInfoEntryStack.topInPixels = -4;

		const playerGuiComponentArray = getPlayerGuiComponentArray();
		const gameplayState = getGameplayState();

		for (const [eid, entry] of playerGuiComponentArray.entries()) {
			if (!entry) {
				continue;
			}
			this.partyInfoEntryStack.addControl(entry.getRoot());
			entry.setSelected(gameplayState.selectedPlayerEID === eid);
		}

		this.rootContainer.addControl(this.partyInfoEntryStack);
	}

	public setPartyInfoSwitches() {
		if (!this.rootContainer) {
			return;
		}
	}
}
