import { removeEntity } from "bitecs";
import { getActorStateComponentArray } from "./ComponentModule";
import { getPlayerFactory } from "./FactoryModule";
import {
	getCampaignState,
	getGameplayState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";

async function loadPlayerCharacter(charId: string): Promise<number> {
	const playerFactory = getPlayerFactory();
	const playerEntityId = await playerFactory.createEntityFromFile(charId);

	return playerEntityId;
}

export async function loadStartingPlayerParty() {
	const campaignState = getCampaignState();
	const gameplayState = getGameplayState();
	const userInterfaceState = getUserInterfaceState();

	const partyCharacterIds = campaignState.startingPartyIds;

	const playerEntityIds: number[] = [];
	for (let i = 0; i < partyCharacterIds.length; i++) {
		const newPlayerCharacter = await loadPlayerCharacter(
			partyCharacterIds[i],
		);
		playerEntityIds.push(newPlayerCharacter);
	}

	gameplayState.playerEIDs = playerEntityIds;
	gameplayState.selectedPlayerEID = playerEntityIds[0];
	userInterfaceState.partyInfoHud.setPartyInfoEntryStack();
}

export function resetPlayerActorState() {
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	gameplayState.playerEIDs.forEach((eid) => {
		const playerData = actorStateComponentArray[eid];
		const rcvyAttr = playerData.attributes.recovery;
		rcvyAttr.maximumValue = 0;
		playerData.queuedAction = null;
	});
}

export function disposeEnemyEntities() {
	const gameplayState = getGameplayState();
	const world = getGameScene().world;
	gameplayState.enemyEIDs.forEach((eid) => {
		removeEntity(world, eid);
	});
}
