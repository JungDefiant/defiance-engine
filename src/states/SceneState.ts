import {
	Engine,
	Nullable,
	Scene,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { EntityId, World } from "bitecs";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { ComponentRegistry } from "src/registries/ComponentRegistry";
import {
	EncounterMap as EncounterProps,
	Location as LocationProps,
	SceneData,
} from "src/types/GameTypes";

export default class SceneState {
	public readonly engine: Engine;
	public readonly world: World;
	public readonly currentScene: Scene;
	public readonly uiScene: Scene;
	public readonly cameraEntityId: EntityId;
	public readonly sceneNodes: TransformNode[];
	public readonly startLocationId: string;
	public readonly mapModelId: string;
	public readonly difficultyLevel: number;
	public readonly startMusicId: string;
	public readonly dialogueFileId: string;
	public readonly encounters: EncounterProps;
	public readonly locations: LocationProps[];
	public readonly modalIds: string[];
	public readonly componentRegistry: ComponentRegistry;
	public lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	public currentLocation: Nullable<LocationProps> = null;

	public constructor(newProps: SceneStateProps) {
		this.engine = newProps.engine;
		this.world = newProps.world;
		this.currentScene = newProps.scene;
		this.uiScene = newProps.uiScene;
		this.cameraEntityId = newProps.cameraEntityId;
		this.sceneNodes = newProps.sceneNodes;
		this.startLocationId = newProps.startLocationId;
		this.mapModelId = newProps.mapModelId;
		this.difficultyLevel = newProps.difficultyLevel;
		this.startMusicId = newProps.startMusicId;
		this.dialogueFileId = newProps.dialogueFileId;
		this.encounters = newProps.encounters;
		this.locations = newProps.locations;
		this.modalIds = newProps.modalIds;
		this.componentRegistry = new ComponentRegistry(this);
	}
}

export interface SceneStateProps {
	readonly engine: Engine;
	readonly world: World;
	readonly scene: Scene;
	readonly uiScene: Scene;
	readonly cameraEntityId: EntityId;
	readonly sceneNodes: TransformNode[];
	readonly startLocationId: string;
	readonly mapModelId: string;
	readonly difficultyLevel: number;
	readonly startMusicId: string;
	readonly dialogueFileId: string;
	readonly encounters: EncounterProps;
	readonly locations: LocationProps[];
	readonly modalIds: string[];
}
