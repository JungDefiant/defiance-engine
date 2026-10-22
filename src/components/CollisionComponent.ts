import { EntityId } from "bitecs";
import { Component } from "./Component";
import {
	CollisionBehaviorData,
	CollisionShapeType,
} from "src/types/CollisionTypes";

export default class CollisionComponent implements Component {
	entityId: EntityId;
	shape: CollisionShapeType;
	radius: number;
	isBlocking: boolean;
	collisionBehaviors: CollisionBehaviorData[];

	constructor(
		entityId: EntityId,
		radius: number = 0.3,
		isBlocking: boolean = true,
		collisionBehaviors: CollisionBehaviorData[] = [],
	) {
		this.entityId = entityId;
		this.shape = "sphere";
		this.radius = radius;
		this.isBlocking = isBlocking;
		this.collisionBehaviors = collisionBehaviors;
	}

	public getValue(): CollisionComponent {
		return this;
	}

	public dispose(): void {}
}
