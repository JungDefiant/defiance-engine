import { EntityId, observe, onGet, onRemove, onSet } from "bitecs";
import SceneState from "src/states/SceneState";
import { Component } from "src/components/Component";

export class ComponentRegistry {
	private sceneState: SceneState;
	private componentArrays: Map<string, Array<Component>> = new Map();

	public constructor(sceneState: SceneState) {
		this.sceneState = sceneState;
	}

	public registerNewComponentArray<T extends Component>(componentId: string) {
		const componentArray = new Array<T>();

		this.componentArrays.set(componentId, componentArray as Array<T>);

		observe(
			this.sceneState.world,
			onSet(componentArray),
			(eid: EntityId, params: T) => {
				componentArray[eid] = params;
			},
		);

		observe(
			this.sceneState.world,
			onGet(componentArray),
			(eid: EntityId) => {
				return componentArray[eid];
			},
		);

		observe(
			this.sceneState.world,
			onRemove(componentArray),
			(eid: EntityId) => {
				componentArray[eid].dispose();
				componentArray.splice(eid);
			},
		);
	}

	public getComponentArrayByComponentId<T>(componentId: string): Array<T> {
		return (
			(this.componentArrays.get(componentId) as Array<T>) ||
			new Array<T>()
		);
	}

	public getComponentByEntityId<T extends Component>(
		componentId: string,
		entityId: EntityId,
	) {
		const componentArray = this.componentArrays.get(
			componentId,
		) as Array<T>;
		return componentArray[entityId].getValue();
	}
}
