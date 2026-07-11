import { container, singleton } from "tsyringe";
import { Engine } from "@babylonjs/core";
import ISystem from "./ISystem";
import { query, removeComponent } from "bitecs";
import GameState from "src/states/GameState";
import { EventData, EventTrigger, EventType } from "src/states/EventData";
import DialogueManagerSystem from "./DialogueManagerSystem";
import CombatManagerSystem from "./CombatManagerSystem";


@singleton()
export default class SessionDataSystem implements ISystem {
	public async start(): Promise<void> {}

	public update(deltaTime: number): void {}

    public checkEventByTrigger(eventTrigger: EventTrigger) {
        const gs = container.resolve(GameState);
        if (!gs || !gs.currentLocation) {
			return;
		}

        const eventsArray = gs.currentLocation.events.filter(evt => evt.trigger === eventTrigger);

        for(const evt of eventsArray) {
            // TO DO: Check condition for event to trigger
            this.triggerEvent(evt);
            const evtIndex = eventsArray.indexOf(evt);
            gs.currentLocation.events.splice(evtIndex);
            return;
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