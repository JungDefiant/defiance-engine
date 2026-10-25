import { Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { Component } from "./Component";

export default class ActorNavigationComponent implements Component {
	entityId: EntityId;
	position: Vector3;
	facingDirection: Vector3;
	destination: Nullable<Vector3> = null;
	speed: number;
	agentIndex: number = -1;
	isNavigating: boolean = false;
	onDestinationReachedEvent: Nullable<() => void> = null;

	constructor(entityId: EntityId, position: Vector3, speed: number) {
		this.entityId = entityId;
		this.position = position.clone();
		this.facingDirection = new Vector3(0, 0, -1);
		this.speed = speed;
	}

	public getValue(): ActorNavigationComponent {
		return this;
	}

	public dispose(): void {}
}
