import { EntityFactory } from "src/factories/EntityFactory";
import { singleton } from "tsyringe";

@singleton()
export class FactoryRegistry {
	private entityFactories: Map<string, EntityFactory> = new Map();

	public registerNewEntityFactory(
		factoryId: string,
		newFactory: EntityFactory,
	) {
		this.entityFactories.set(factoryId, newFactory);
	}

	public getAllEntityFactories(): Map<string, EntityFactory> {
		return this.entityFactories;
	}

	public getEntityFactoryByFactoryId<T>(factoryId: string): T {
		return this.entityFactories.get(factoryId) as T;
	}
}
