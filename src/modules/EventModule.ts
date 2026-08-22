import { GameEventTrigger, GameEvent } from "src/types/EventTypes";
import { getGameScene } from "./GameStateModule";
import { startDialogue } from "./DialogueModule";
import { startCombat } from "./CombatModule";
import { showModal } from "./UserInterfaceModule";

export function checkEventByTrigger(eventTrigger: GameEventTrigger) {
	const gameScene = getGameScene();
	if (!gameScene.currentLocation) {
		return;
	}

	const eventsArray = gameScene.currentLocation.events.filter(
		(event) => event.trigger === eventTrigger,
	);

	for (const event of eventsArray) {
		triggerEventByType(event);
		const eventIndex = eventsArray.indexOf(event);
		gameScene.currentLocation.events.splice(eventIndex);
		return;
	}
}

function triggerEventByType(event: GameEvent) {
	if (event.type === "Dialogue") {
		triggerDialogueEvent(event);
		return;
	}

	if (event.type === "Combat") {
		triggerCombatEvent(event);
		return;
	}

	if (event.type === "Modal") {
		triggerModalEvent(event);
		return;
	}
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
