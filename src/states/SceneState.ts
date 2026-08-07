import { Nullable, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { World } from "bitecs";
import { DEFAULT_CAM_TARGET } from "src/Constants";
import { LocationData, SceneData } from "src/types/GameTypes";

export const STATE_ID_SCENESTATE = "SceneState";

export default class SceneState {
	public readonly world: World;
	public readonly currentScene: Scene;
	public readonly sceneData: SceneData;
	public readonly uiScene: Scene;
	public readonly sceneNodes: TransformNode[];
	public lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	public currentLocation: Nullable<LocationData> = null;

	public constructor(newProps: SceneStateProps) {
		this.world = newProps.world;
		this.currentScene = newProps.scene;
		this.sceneData = newProps.sceneData;
		this.uiScene = newProps.uiScene;
		this.sceneNodes = newProps.sceneNodes;
	}
}

export interface SceneStateProps {
	readonly world: World;
	readonly scene: Scene;
	readonly sceneData: SceneData;
	readonly uiScene: Scene;
	readonly sceneNodes: TransformNode[];
}
