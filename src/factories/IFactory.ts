import { EntityId } from "bitecs";

export interface IFactory {
	start(): void;
	createEntityFromFile(fileName: string, campaignId: string): Promise<EntityId>;
}
