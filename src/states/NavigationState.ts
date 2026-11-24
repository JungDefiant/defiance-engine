import { ICrowd, Nullable } from "@babylonjs/core";
import type { RecastNavigationJSPluginV2 } from "@babylonjs/addons";
import { EnvironmentObstacleData } from "src/types/CollisionTypes";
import { EntityId } from "bitecs";

export default class NavigationState {
    public navigationPlugin: Nullable<RecastNavigationJSPluginV2> = null;
    public navigationCrowd: Nullable<ICrowd> = null;

    public followingPartyMemberIds: Set<EntityId> = new Set();
    public isInitializingNavMesh = false;

    public readonly navigationObstacles: EnvironmentObstacleData[] = [];

    public constructor() {}
}
