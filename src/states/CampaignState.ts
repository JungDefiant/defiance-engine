import { CampaignData, StoryVariable } from "src/types/GameTypes";

export default class CampaignState {
	public readonly campaignId: string;
	public readonly startSceneId: string;
	public readonly startDialogueId: string;
	public readonly flagIds: string[];
	public readonly keyItemIds: string[];
	public readonly startingPartyIds: string[];
	public readonly storyVariableMap: Map<string, StoryVariable> = new Map();

	public constructor(loadedCampaignData: CampaignData) {
		this.campaignId = loadedCampaignData.id;
		this.startSceneId = loadedCampaignData.startSceneId;
		this.startDialogueId = loadedCampaignData.startDialogueId;
		this.flagIds = loadedCampaignData.flagIds;
		this.keyItemIds = loadedCampaignData.keyItemIds;
		this.startingPartyIds = loadedCampaignData.startingPartyIds;
	}
}
