import { singleton } from "tsyringe";
import { Engine } from "@babylonjs/core";
import { getPublicRoot } from "src/Utils";
import ISystem from "./ISystem";
import { query, removeComponent } from "bitecs";
import GameState from "src/states/GameState";
import { EventType, GameEvent } from "src/gui/components/GameEvent";


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
                this.triggerEvent(event);
                removeComponent(gameState.world, eid, event);
            }
        }
    }

    private triggerEvent(event: GameEvent) {
        switch(event.type) {
            case EventType.Dialogue:
                return;
            case EventType.Modal:
                return;
            case EventType.Combat:
                return;
        }
    }
}