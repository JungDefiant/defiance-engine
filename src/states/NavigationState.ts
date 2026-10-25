import { ICrowd, Nullable } from "@babylonjs/core";
import type { RecastNavigationJSPluginV2 } from "@babylonjs/addons";
import { EnvironmentObstacleData } from "src/types/CollisionTypes";

export default class NavigationState {
	public navigationPlugin: Nullable<RecastNavigationJSPluginV2> = null;
	public navigationCrowd: Nullable<ICrowd> = null;

	public isInitializingNavMesh = false;

	public readonly navigationObstacles: EnvironmentObstacleData[] = [];

	public constructor() {}
}
