import { GameEventTrigger, GameEvent } from "src/types/EventTypes";
import { getGameScene } from "./GameStateModule";
import { startDialogue } from "./DialogueModule";
import { startCombat } from "./CombatModule";
import { showModal } from "./UserInterfaceModule";
import { getGameEventProcessor } from "./ProcessorModule";

export function checkEventByTrigger(eventTrigger: GameEventTrigger) {
	const gameScene = getGameScene();
	const eventsArray = gameScene.events.filter(
		(event) => event.trigger === eventTrigger,
	);

	for (const event of eventsArray) {
		getGameEventProcessor().getProcessorFunction(event.type)(event);
		const eventIndex = eventsArray.indexOf(event);
		gameScene.events.splice(eventIndex, 1);
		return;
	}
}

export function filterSceneEvents(events: GameEvent[]) {
	const uniqueEvents = new Set<string>();
	const filteredEvents: GameEvent[] = [];
	events.forEach((event) => {
		const eventKey = `${event.trigger}_${event.type}_${event.condition}`;
		if (!uniqueEvents.has(eventKey)) {
			uniqueEvents.add(eventKey);
			filteredEvents.push(event);
		}
	});
	events.length = 0;
	events.push(...filteredEvents);
}

export function triggerDialogueEvent(event: GameEvent) {
	startDialogue(event.assetId);
}

export function triggerCombatEvent(event: GameEvent) {
	startCombat(event.assetId);
}

export function triggerModalEvent(event: GameEvent) {
	showModal(event.assetId);
}
