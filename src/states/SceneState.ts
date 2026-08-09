import {
	Engine,
	Nullable,
	Scene,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { World } from "bitecs";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import { LocationData, SceneData } from "src/types/GameTypes";

export default class SceneState {
	public readonly engine: Engine;
	public readonly world: World;
	public readonly currentScene: Scene;
	public readonly sceneData: SceneData;
	public readonly uiScene: Scene;
	public readonly sceneNodes: TransformNode[];
	public readonly componentRegistry: ComponentRegistry;
	public lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	public currentLocation: Nullable<LocationData> = null;

	public constructor(newProps: SceneStateProps) {
		this.engine = newProps.engine;
		this.world = newProps.world;
		this.currentScene = newProps.scene;
		this.sceneData = newProps.sceneData;
		this.uiScene = newProps.uiScene;
		this.sceneNodes = newProps.sceneNodes;
		this.componentRegistry = new ComponentRegistry(this);
	}
}

export interface SceneStateProps {
	readonly engine: Engine;
	readonly world: World;
	readonly scene: Scene;
	readonly sceneData: SceneData;
	readonly uiScene: Scene;
	readonly sceneNodes: TransformNode[];
}
