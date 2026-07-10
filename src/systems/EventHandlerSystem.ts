import { container, singleton } from "tsyringe";
import { Engine } from "@babylonjs/core";
import { getPublicRoot } from "src/Utils";
import ISystem from "./ISystem";
import { query, removeComponent } from "bitecs";
import GameState from "src/states/GameState";
import { EventType, GameEvent } from "src/gui/components/GameEvent";
import DialogueManagerSystem from "./DialogueManagerSystem";
import CombatManagerSystem from "./CombatManagerSystem";


@singleton()
export default class SessionDataSystem implements ISystem {
	public async start(engine: Engine): Promise<void> {}

	public update(deltaTime: number, gameState?: GameState): void {
        if (!gameState) {
			return;
		}

        for(const eid of query(gameState.world, [gameState.GameEvent])) {
            const event = gameState.GameEvent[eid];
            if(event.isTriggered) {
                this.triggerEvent(event, gameState);
                removeComponent(gameState.world, eid, event);
            }
        }
    }

    private triggerEvent(event: GameEvent, gameState: GameState) {
        switch(event.type) {
            case EventType.Dialogue:
                const dmSystem = container.resolve(DialogueManagerSystem);
                dmSystem.startDialogue(event.source);
                return;
            case EventType.Modal:
                // Load modal data
                // gameState.modalScreen.setNewPages();
                gameState.modalScreen.showHide(true);
                return;
            case EventType.Combat:
                const cmSystem = container.resolve(CombatManagerSystem);
                cmSystem.startCombat(event.source);
                return;
        }
    }
}