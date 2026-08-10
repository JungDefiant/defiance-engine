import { container, inject } from "tsyringe";
import { EventData, EventTrigger } from "src/types/EventTypes";
import GameSystem from "./GameSystem";
import DialogueManagerSystem from "./DialogueManagerSystem";
import CombatManagerSystem from "./CombatManagerSystem";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";

export const SYSTEM_ID_EVENTHANDLER = "EventHandler";

export default class EventHandlerSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(): Promise<void> {}

	public update(deltaTime: number): void {}

	public checkEventByTrigger(eventTrigger: EventTrigger) {
		const gs = container.resolve(GameState);
		if (!gs || !gs.currentLocation) {
			return;
		}

		const eventsArray = gs.currentLocation.events.filter(
			(evt) => evt.trigger === eventTrigger,
		);

		for (const evt of eventsArray) {
			// TO DO: Check condition for event to trigger
			this.triggerEvent(evt);
			const evtIndex = eventsArray.indexOf(evt);
			gs.currentLocation.events.splice(evtIndex);
			return;
		}
	}

	private triggerEvent(event: EventData) {
		switch (event.type) {
			case "Dialogue":
				const dmSystem = container.resolve(DialogueManagerSystem);
				dmSystem.startDialogue(event.refId);
				return;
			case "Modal":
				const gs = container.resolve(GameState);
				const modalData = gs.modalMap.get(event.refId);
				if (!modalData) {
					return;
				}
				gs.modalScreen.setNewPages(modalData.pages);
				gs.modalScreen.showHide(true);
				return;
			case "Combat":
				const cmSystem = container.resolve(CombatManagerSystem);
				cmSystem.startCombat(event.refId);
				return;
		}
	}
}
