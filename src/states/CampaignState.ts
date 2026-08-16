import { StoryVariable } from "src/types/GameTypes";
import { singleton } from "tsyringe";
import type { LoadedCampaignJson } from "src/types/GameTypes";

@singleton()
export default class CampaignState {
	public readonly campaignId: string;
	public readonly startSceneId: string;
	public readonly startDialogueId: string;
	public readonly flagIds: string[];
	public readonly keyItemIds: string[];
	public readonly startingPartyIds: string[];
	public readonly storyVariableMap: Map<string, StoryVariable> = new Map();

	public constructor(loadedCampaignData: LoadedCampaignJson) {
		this.campaignId = loadedCampaignData.id;
		this.startSceneId = loadedCampaignData.startSceneId;
		this.startDialogueId = loadedCampaignData.startDialogueId;
		this.flagIds = loadedCampaignData.flagIds;
		this.keyItemIds = loadedCampaignData.keyItemIds;
		this.startingPartyIds = loadedCampaignData.startingPartyIds;
	}
}
