import { singleton } from "tsyringe";
import { Engine, Scene } from "@babylonjs/core";
import type {
	Nullable,
	SceneOptions,
	TransformNode,
} from "@babylonjs/core";
import { createWorld, World } from "bitecs";
import {
	DoorData,
	EncounterMap,
	Interactable,
} from "src/types/GameTypes";
import type { GameEvent } from "src/types/EventTypes";
// import { ShowInspector } from "@babylonjs/inspector";

@singleton()
export class GameScene extends Scene {
	private readonly _mapModelId: string;
	private readonly _difficultyLevel: number;
	private readonly _startMusicId: string;
	private readonly _dialogueFileId: string;
	private readonly _encounters: EncounterMap;
	private readonly _interactables: Interactable[];
	private readonly _doors: DoorData[];
	private readonly _events: GameEvent[];
	private readonly _modalIds: string[];

	private _world: World;
	private _sceneNodes: Nullable<TransformNode[]> = null;

	public constructor(
		engine: Engine,
		sceneProps: GameSceneProps,
		options?: SceneOptions,
	) {
		super(engine, options);
		this._world = createWorld();
		this._startMusicId = sceneProps.startMusicId;
		this._mapModelId = sceneProps.mapModelId;
		this._difficultyLevel = sceneProps.difficultyLevel;
		this._dialogueFileId = sceneProps.dialogueFileId;
		this._encounters = sceneProps.encounters;
		this._interactables = sceneProps.interactables;
		this._doors = sceneProps.doors;
		this._events = sceneProps.events;
		this._modalIds = sceneProps.modalIds;

		// ShowInspector(this);

		// Promise.resolve(
		// 	ImportMeshAsync(
		// 		`${getPublicRoot()}/models/maps/${this._mapModelId}`,
		// 		this,
		// 		{
		// 			pluginOptions: {},
		// 		},
		// 	),
		// ).then((sceneLoaderResult) => {
		// 	this._sceneNodes = sceneLoaderResult.transformNodes;
		// });
	}

	public get world(): World {
		return this._world;
	}

	public get sceneNodes(): Nullable<TransformNode[]> {
		return this._sceneNodes;
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

	public get interactables(): Interactable[] {
		return this._interactables;
	}

	public get doors(): DoorData[] {
		return this._doors;
	}

	public get events(): GameEvent[] {
		return this._events;
	}

	public get modalIds(): string[] {
		return this._modalIds;
	}

	public set sceneNodes(value: TransformNode[]) {
		this._sceneNodes = value;
	}
}

export interface GameSceneProps {
	readonly engine: Engine;
	readonly world: World;
	readonly scene: Scene;
	readonly uiScene: Scene;
	readonly mapModelId: string;
	readonly difficultyLevel: number;
	readonly startMusicId: string;
	readonly dialogueFileId: string;
	readonly encounters: EncounterMap;
	readonly interactables: Interactable[];
	readonly doors: DoorData[];
	readonly events: GameEvent[];
	readonly modalIds: string[];
}
