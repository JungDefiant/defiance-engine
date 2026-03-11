import { Nullable } from "@babylonjs/core";
import {
	AdvancedDynamicTexture,
	Container,
	Control,
	Rectangle,
	StackPanel,
} from "@babylonjs/gui";
import IHUD from "./IHUD";

export default class PartyInfoHUD implements IHUD {
	public rootContainer: Nullable<Container> = null;

	private partyInfoEntries: Nullable<Container[]> = null;

	public showHideHud(show: boolean): void {
		this.rootContainer!.isVisible = show ? true : false;
	}

	public createHUD(fullscreen: AdvancedDynamicTexture) {
		this.rootContainer = new Container("ui_partyInfoHud");
		this.rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.rootContainer.width = "800px";
		this.rootContainer.height = "240px";
		this.rootContainer.top = "400px";
		fullscreen.addControl(this.rootContainer);

		const background = new Rectangle("ui_partyInfoHudBg");
		background.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		background.background = "gray";
		background.color = "black";
		background.widthInPixels = 800;
		background.heightInPixels = 110;
		background.topInPixels = 38;
		this.rootContainer.addControl(background);

		const partyInfoEntryStack = new StackPanel("ui_partyInfoEntryStack");
		partyInfoEntryStack.isVertical = false;
		partyInfoEntryStack.spacing = 16;
		partyInfoEntryStack.topInPixels = 12;

		this.partyInfoEntries = [
			this.createPartyInfoEntry(0),
			this.createPartyInfoEntry(1),
			this.createPartyInfoEntry(2),
		];

		for (let i = 0; i < this.partyInfoEntries.length; i++) {
			const entry = this.partyInfoEntries[i];
			partyInfoEntryStack.addControl(entry);
		}

		this.rootContainer.addControl(partyInfoEntryStack);
	}

	private createPartyInfoEntry(index: number): Container {
		const partyInfoEntry = new Rectangle("ui_partyInfoEntry_" + index);
		partyInfoEntry.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		partyInfoEntry.background = "gray";
		partyInfoEntry.color = "black";
		partyInfoEntry.widthInPixels = 200;
		partyInfoEntry.heightInPixels = 128;

		return partyInfoEntry;
	}
}
