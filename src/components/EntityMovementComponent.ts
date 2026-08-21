import { TransformNode, Vector3 } from "@babylonjs/core";
import { Component } from "./Component";

export default class EntityMovementComponent implements Component {
	position: Vector3;
	destination: Vector3;
	speed: number;
	onDestinationReachedEvent: Function;

	constructor(
		_position: Vector3,
		_destination: Vector3,
		_speed: number,
		_onDestinationReachedEvent: Function,
	) {
		this.position = _position;
		this.destination = _destination;
		this.speed = _speed;
		this.onDestinationReachedEvent = _onDestinationReachedEvent;
	}

	public getValue(): EntityMovementComponent {
		return this;
	}

	public dispose(): void {}
}
