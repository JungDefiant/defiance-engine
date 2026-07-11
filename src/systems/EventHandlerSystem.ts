import { container, singleton } from "tsyringe";
import { Engine } from "@babylonjs/core";
import ISystem from "./ISystem";
import { query, removeComponent } from "bitecs";
import GameState from "src/states/GameState";
import { EventData } from "src/states/EventData";
import DialogueManagerSystem from "./DialogueManagerSystem";
import CombatManagerSystem from "./CombatManagerSystem";


@singleton()
export default class SessionDataSystem implements ISystem {
	public async start(): Promise<void> {}

	public update(deltaTime: number, gameState?: GameState): void {
        if (!gameState || !gameState.currentLocation) {
			return;
		}

        const eventsArray = gameState.currentLocation.events;
        const eventIndexToRemove = [];

        for(const evt of eventsArray) {
            if(evt.isTriggered) {
                this.triggerEvent(evt);
                evt.isTriggered = false;
                const evtIndex = eventsArray.indexOf(evt);
                eventIndexToRemove.push(evtIndex);
            }
        }

        for(const ind of eventIndexToRemove) {
            gameState.currentLocation.events.splice(ind);
        }
    }

    private triggerEvent(event: EventData) {
        switch(event.type) {
            case "Dialogue":
                const dmSystem = container.resolve(DialogueManagerSystem);
                dmSystem.startDialogue(event.refId);
                return;
            case "Modal":
                const gs = container.resolve(GameState);
                const modalData = gs.modalMap.get(event.refId);
                if(!modalData) {
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