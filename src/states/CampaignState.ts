import { StoryVariable } from "src/types/GameTypes";
import { singleton } from "tsyringe";

export const STATE_ID_CAMPAIGNSTATE = "CampaignState";

export default class CampaignState {
	public readonly campaignId: string;
	public readonly storyVariableMap: Map<string, StoryVariable> = new Map();

	public constructor(campaignId: string) {
		this.campaignId = campaignId;
	}
}
