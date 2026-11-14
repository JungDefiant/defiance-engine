import { Mesh, VertexBuffer, VertexData, FloatArray } from "@babylonjs/core";

export function getPublicRoot(): string {
    return import.meta.env.PROD ? import.meta.env.BASE_URL : ".";
}

export function cmToMeters(centimeters: number): number {
    return centimeters / 100;
}

export function clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
