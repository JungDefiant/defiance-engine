import { EntityId } from "bitecs";

export interface EntityFactory {
	start(campaignId: string): void;
	createEntityFromFile(fileName: string): Promise<EntityId>;
}
