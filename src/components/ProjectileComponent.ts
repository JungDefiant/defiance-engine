import { Mesh, Nullable, Vector3 } from "@babylonjs/core";
import { EntityId } from "bitecs";
import { AbilityData } from "src/types/AbilityTypes";
import { Component } from "./Component";

export interface ProjectileComponentConstructorProperties {
    mesh: Mesh;
    direction: Vector3;
    speed: number;
    distanceTraveled: number;
    maxRange: number;
    radius: number;
    sourceEid: EntityId;
    actionData: AbilityData;
    targetEntityId?: EntityId;
    targetPosition?: Vector3;
    sphereRadius?: number;
}

export default class ProjectileComponent implements Component {
    public readonly mesh: Mesh;
    public readonly maxRange: number;
    public readonly radius: number;
    public readonly sourceEid: EntityId;
    public readonly actionData: AbilityData;
    public readonly targetEntityId?: EntityId;
    public readonly targetPosition?: Vector3;
    public readonly sphereRadius?: number;
    public direction: Vector3;
    public speed: number;
    public distanceTraveled: number;
    public lastTargetPosition: Nullable<Vector3>;

    constructor(props: ProjectileComponentConstructorProperties) {
        this.mesh = props.mesh;
        this.maxRange = props.maxRange;
        this.radius = props.radius;
        this.sourceEid = props.sourceEid;
        this.actionData = props.actionData;
        this.targetEntityId = props.targetEntityId;
        this.targetPosition = props.targetPosition;
        this.sphereRadius = props.sphereRadius;
        this.direction = props.direction;
        this.speed = props.speed;
        this.distanceTraveled = props.distanceTraveled;
        this.lastTargetPosition = props.targetPosition
            ? props.targetPosition.clone()
            : null;
    }

    public getValue(): ProjectileComponent {
        return this;
    }

    public dispose(): void {
        this.mesh.material?.dispose();
        this.mesh.dispose();
    }
}
