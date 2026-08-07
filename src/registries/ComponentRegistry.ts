import { EntityId, observe, onGet, onRemove, onSet } from "bitecs";
import { container, inject, singleton } from "tsyringe";
import { ActorStateComponent } from "src/components/ActorStateComponent";
import { GameStateRegistry } from "./GameStateRegistry";
import SceneState, { STATE_ID_SCENESTATE } from "src/states/SceneState";

singleton();
export class ComponentRegistry {
	private componentArrays: Map<string, Array<Component>> = new Map();

	public constructor(
		@inject(GameStateRegistry) private gameStateRegistry: GameStateRegistry,
	) {}

	public registerNewComponent(componentId: string, newComponent: Component) {
		const sceneState =
			this.gameStateRegistry.getGameStateByStateId<SceneState>(
				STATE_ID_SCENESTATE,
			);

		if (!this.componentArrays.has(componentId)) {
			this.componentArrays.set(componentId, new Array());
		}

		const componentArray = this.componentArrays.get(
			componentId,
		) as Array<Component>;

		observe(
			sceneState.world,
			onSet(componentArray),
			(eid: EntityId, params: ActorStateComponent) => {
				componentArray[eid] = params;
			},
		);

		observe(sceneState.world, onGet(componentArray), (eid: EntityId) => {
			return componentArray[eid];
		});

		observe(sceneState.world, onRemove(componentArray), (eid: EntityId) => {
			componentArray[eid].dispose();
			componentArray.splice(eid);
		});
	}

	public getComponentArrayByComponentId<T>(componentId: string): Array<T> {
		return (
			(this.componentArrays.get(componentId) as Array<T>) ||
			new Array<T>()
		);
	}

	public getComponentByEntityId<T>(componentId: string, entityId: EntityId) {
		const componentArray = this.componentArrays.get(
			componentId,
		) as Component[];
		return componentArray[entityId].getValue() as T;
	}
}

export interface Component {
	getValue(): any;
	dispose(): void;
}
