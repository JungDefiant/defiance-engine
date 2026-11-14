import { EntityId } from "bitecs";
import { Component } from "./Component";
import {
    ActorTactic,
    DefaultBehavior,
    createDefaultActorTactics,
} from "src/types/BehaviorTypes";

export default class ActorBehaviorComponent implements Component {
    entityId: EntityId;
    tactics: ActorTactic[];
    defaultBehavior: DefaultBehavior;
    currentInterval: number = 0;

    constructor(
        entityId: EntityId,
        tactics: ActorTactic[] = [],
        defaultBehavior: DefaultBehavior = DefaultBehavior.Aggressive,
    ) {
        this.entityId = entityId;
        this.tactics = tactics ?? createDefaultActorTactics();
        this.defaultBehavior = defaultBehavior;
    }

    public getValue(): ActorBehaviorComponent {
        return this;
    }

    public dispose(): void {}
}
