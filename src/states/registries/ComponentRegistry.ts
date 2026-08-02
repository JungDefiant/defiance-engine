import { EntityId } from "bitecs";
import { singleton } from "tsyringe";

singleton();
export class ComponentRegistry {
	private componentArrays: Map<string, Array<Component>> = new Map();

	public getComponentArray(componentId: string) {
		return this.componentArrays.get(componentId);
	}

	public getComponentByEntityId<T>(componentId: string, entityId: EntityId) {
		const componentArray = this.componentArrays.get(componentId);
		if (componentArray) {
			return componentArray[entityId].getValue() as T;
		} else {
			return null;
		}
	}

	public createNewComponentArray(componentId: string) {
		this.componentArrays.set(componentId, new Array());
	}
}

export interface Component {
	getValue(): any;
	dispose(): void;
}
