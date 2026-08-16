import { singleton } from "tsyringe";
import { SystemRegistry } from "../registries/SystemRegistry";
import { GameStateRegistry } from "../registries/GameStateRegistry";
import { FactoryRegistry } from "../registries/FactoryRegistry";
import { ComponentRegistry } from "../registries/ComponentRegistry";
import { Engine, ImportMeshAsync, Scene } from "@babylonjs/core";
import type {
	Nullable,
	SceneOptions,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { createWorld, EntityId, World } from "bitecs";
import { DEFAULT_CAM_TARGET } from "src/constants/GeneralConstants";
import { EncounterMap, SceneLocation } from "src/types/GameTypes";
import { createSceneCamera, getSceneNodes } from "src/modules/SceneModule";
import { getPublicRoot } from "src/modules/Utils";

@singleton()
export class GameScene extends Scene {
	private readonly _cameraEntityId: EntityId;
	private readonly _startLocationId: string;
	private readonly _mapModelId: string;
	private readonly _difficultyLevel: number;
	private readonly _startMusicId: string;
	private readonly _dialogueFileId: string;
	private readonly _encounters: EncounterMap;
	private readonly _locations: SceneLocation[];
	private readonly _modalIds: string[];

	private _world: World;
	private _systemRegistry: SystemRegistry;
	private _factoryRegistry: FactoryRegistry;
	private _gameStateRegistry: GameStateRegistry;
	private _componentRegistry: ComponentRegistry;
	private _lastExploreViewTarget: Vector3 = DEFAULT_CAM_TARGET;
	private _currentLocation: Nullable<SceneLocation> = null;
	private _sceneNodes: Nullable<TransformNode[]> = null;

	public constructor(
		engine: Engine,
		sceneProps: GameSceneProps,
		options?: SceneOptions,
	) {
		super(engine, options);
		this._world = createWorld();
		this._systemRegistry = new SystemRegistry();
		this._factoryRegistry = new FactoryRegistry();
		this._gameStateRegistry = new GameStateRegistry();
		this._componentRegistry = new ComponentRegistry(this._world);
		this._startLocationId = sceneProps.startLocationId;
		this._startMusicId = sceneProps.startMusicId;
		this._mapModelId = sceneProps.mapModelId;
		this._difficultyLevel = sceneProps.difficultyLevel;
		this._dialogueFileId = sceneProps.dialogueFileId;
		this._encounters = sceneProps.encounters;
		this._locations = sceneProps.locations;
		this._modalIds = sceneProps.modalIds;

		this._cameraEntityId = createSceneCamera(this);
	}

	public get world(): World {
		return this._world;
	}

	public get systemRegistry(): SystemRegistry {
		return this._systemRegistry;
	}

	public get factoryRegistry(): FactoryRegistry {
		return this._factoryRegistry;
	}

	public get gameStateRegistry(): GameStateRegistry {
		return this._gameStateRegistry;
	}

	public get componentRegistry(): ComponentRegistry {
		return this._componentRegistry;
	}

	public get lastExploreViewTarget(): Vector3 {
		return this._lastExploreViewTarget;
	}

	public get currentLocation(): Nullable<SceneLocation> {
		return this._currentLocation;
	}

	public get cameraEntityId(): EntityId {
		return this._cameraEntityId;
	}

	public get sceneNodes(): Nullable<TransformNode[]> {
		return this._sceneNodes;
	}

	public get startLocationId(): string {
		return this._startLocationId;
	}

	public get mapModelId(): string {
		return this._mapModelId;
	}

	public get difficultyLevel(): number {
		return this._difficultyLevel;
	}

	public get startMusicId(): string {
		return this._startMusicId;
	}

	public get dialogueFileId(): string {
		return this._dialogueFileId;
	}

	public get encounters(): EncounterMap {
		return this._encounters;
	}

	public get locations(): SceneLocation[] {
		return this._locations;
	}

	public get modalIds(): string[] {
		return this._modalIds;
	}

	public set sceneNodes(value: TransformNode[]) {
		this._sceneNodes = value;
	}

	public set lastExploreViewTarget(value: Vector3) {
		this._lastExploreViewTarget = value;
	}

	public set currentLocation(value: SceneLocation) {
		this._currentLocation = value;
	}
}

export interface GameSceneProps {
	readonly engine: Engine;
	readonly world: World;
	readonly scene: Scene;
	readonly uiScene: Scene;
	readonly startLocationId: string;
	readonly mapModelId: string;
	readonly difficultyLevel: number;
	readonly startMusicId: string;
	readonly dialogueFileId: string;
	readonly encounters: EncounterMap;
	readonly locations: SceneLocation[];
	readonly modalIds: string[];
}
