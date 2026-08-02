import { singleton } from "tsyringe";

singleton();
export class ComponentRegistry {
	private componentArrays: Map<string, Array<Component>> = new Map();

	public getComponentArray(componentId: string) {
		return this.componentArrays.get(componentId);
	}

	public createComponentArray(componentId: string) {
		this.componentArrays.set(componentId, new Array());
	}
}

export interface Component {}
