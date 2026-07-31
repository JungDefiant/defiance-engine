import { TransformNode, Vector3 } from "@babylonjs/core";

export class EntityMovement {
	transform: TransformNode;
	destination: Vector3;
	speed: number;

	constructor(
		_transform: TransformNode,
		_destination: Vector3,
		_speed: number,
	) {
		this.transform = _transform;
		this.destination = _destination;
		this.speed = _speed;
	}
}
