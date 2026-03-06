import * as bitecs from "bitecs";
import ISystem from "./ISystem";
import { singleton } from "tsyringe";

@singleton()
export default class ExplorationManagerSystem implements ISystem {
    world: bitecs.World;

    constructor(_world: bitecs.World) {
        this.world = _world;
    }

    public update(): void {
        for (const entityId of bitecs.query(this.world, [])) {
            // Component.value[entityId]    -->     how to access component data
        }
    }

    public loadMap(mapId: string): void {
        
    }

    public loadInteractables(): void {

    }

    public loadEvents(): void {

    }

    public checkEventTriggers(): void {

    }
}