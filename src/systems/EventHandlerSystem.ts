import { container, inject } from "tsyringe";
import { EventData, EventTrigger } from "src/types/EventTypes";
import GameSystem from "./GameSystem";
import DialogueManagerSystem from "./DialogueManagerSystem";
import CombatManagerSystem from "./CombatManagerSystem";
import { SystemRegistry } from "src/registries/SystemRegistry";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import SceneState from "src/states/SceneState";
import UserInterfaceState from "src/states/UserInterfaceState";

export const SYSTEM_ID_EVENTHANDLER = "EventHandler";

export default class EventHandlerSystem implements GameSystem {
	public constructor(
		@inject(SystemRegistry) private systemRegistry: SystemRegistry,
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public async start(): Promise<void> {}

	public update(deltaTime: number): void {}

	public checkEventByTrigger(eventTrigger: EventTrigger) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				SceneState.toString(),
			);
		if (!sceneState.currentLocation) {
			return;
		}

		const eventsArray = sceneState.currentLocation.events.filter(
			(event) => event.trigger === eventTrigger,
		);

		for (const event of eventsArray) {
			// TO DO: Check condition for event to trigger
			this.triggerEvent(event);
			const eventIndex = eventsArray.indexOf(event);
			sceneState.currentLocation.events.splice(eventIndex);
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
				const userInterfaceState =
					this.gameStateRegistry.getGameStateByStateId<UserInterfaceState>(
						UserInterfaceState.toString(),
					);
				const modalData = userInterfaceState.modalMap.get(event.refId);
				if (!modalData) {
					return;
				}
				userInterfaceState.modalScreen.setNewPages(modalData.pages);
				userInterfaceState.modalScreen.showHide(true);
				return;
			case "Combat":
				const cmSystem = container.resolve(CombatManagerSystem);
				cmSystem.startCombat(event.refId);
				return;
		}
	}
}
