import { Mesh, VertexBuffer, VertexData, FloatArray } from "@babylonjs/core";

export function getPublicRoot(): string {
	return import.meta.env.PROD ? import.meta.env.BASE_URL : ".";
}

export function clamp(val: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, val));
}
