import { EntityId, observe, onGet, onRemove, onSet } from "bitecs";
import { Component } from "src/components/Component";
import { singleton } from "tsyringe";
import type { World } from "bitecs";

@singleton()
export class ComponentRegistry {
	private world: World;
	private componentArrays: Map<string, Array<Component>> = new Map();

	public constructor(world: World) {
		this.world = world;
	}

	public registerNewComponentArray<T extends Component>(componentId: string) {
		const componentArray = new Array<T>();

		this.componentArrays.set(componentId, componentArray as Array<T>);

		observe(
			this.world,
			onSet(componentArray),
			(eid: EntityId, params: T) => {
				componentArray[eid] = params;
			},
		);

		observe(this.world, onGet(componentArray), (eid: EntityId) => {
			return componentArray[eid];
		});

		observe(this.world, onRemove(componentArray), (eid: EntityId) => {
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
