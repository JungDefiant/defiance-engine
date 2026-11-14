import { Mesh, Nullable, StandardMaterial } from "@babylonjs/core";
import { EntityId } from "bitecs";

export default class TargetingPreviewState {
	public readonly targetRings: Map<EntityId, Mesh> = new Map();
	public radiusRing: Nullable<Mesh> = null;
	public radiusRingRadius: number = -1;
	public sectorMesh: Nullable<Mesh> = null;
	public sectorAngle: number = -1;
	public targetRingMaterial: Nullable<StandardMaterial> = null;
	public radiusRingMaterial: Nullable<StandardMaterial> = null;
	public sectorMaterial: Nullable<StandardMaterial> = null;

	public constructor() {}
}