import { EntityId } from "bitecs";

export interface EntityFactory {
	start(): void;
	createEntityFromFile(
		fileName: string,
		campaignId: string,
	): Promise<EntityId>;
}
