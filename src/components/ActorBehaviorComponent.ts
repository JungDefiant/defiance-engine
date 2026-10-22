import { EntityId } from "bitecs";
import { Component } from "./Component";
import {
	ActorTactic,
	DefaultBehavior,
	createDefaultActorTactics,
} from "src/types/BehaviorTypes";

export default class ActorBehaviorComponent implements Component {
	entityId: EntityId;
	defaultBehavior: DefaultBehavior;
	tactics: ActorTactic[];

	constructor(
		entityId: EntityId,
		defaultBehavior: DefaultBehavior = DefaultBehavior.Aggressive,
		tactics?: ActorTactic[],
	) {
		this.entityId = entityId;
		this.defaultBehavior = defaultBehavior;
		this.tactics = tactics ?? createDefaultActorTactics();
	}

	public getValue(): ActorBehaviorComponent {
		return this;
	}

	public dispose(): void {}
}
