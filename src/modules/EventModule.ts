import { EventTrigger } from "src/types/EventTypes";
import { getGameScene } from "./GameStateModule";

export function checkEventByTrigger(eventTrigger: EventTrigger) {
	const gameScene = getGameScene();
	if (!gameScene.currentLocation) {
		return;
	}

	const eventsArray = gameScene.currentLocation.events.filter(
		(event) => event.trigger === eventTrigger,
	);

	for (const event of eventsArray) {
		// TO DO: Check condition for event to trigger
		event.triggerFunction();
		const eventIndex = eventsArray.indexOf(event);
		gameScene.currentLocation.events.splice(eventIndex);
		return;
	}
}
