import { EntityId, removeEntity } from "bitecs";
import { getActorStateComponentArray } from "./ComponentModule";
import { getPlayerFactory } from "./FactoryModule";
import {
	getCampaignState,
	getGameplayState,
	getGameScene,
	getUserInterfaceState,
} from "./GameStateModule";
import { getPlayerGuiComponentArray } from "./ComponentModule";
import {
	resetCombatModeActionManager,
	resetCombatModeControls,
} from "./ControlModule";

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

	gameplayState.playerEntityIds = playerEntityIds;
	gameplayState.selectedPlayerEID = playerEntityIds[0];
	userInterfaceState.partyInfoHud.setPartyInfoEntryStack();
}

async function loadPlayerCharacter(charId: string): Promise<number> {
	const playerFactory = getPlayerFactory();
	const playerEntityId = await playerFactory.createEntityFromFile(charId);

	return playerEntityId;
}

export function resetPlayerActorState() {
	const gameplayState = getGameplayState();
	const actorStateComponentArray = getActorStateComponentArray();
	gameplayState.playerEntityIds.forEach((eid) => {
		const playerData = actorStateComponentArray[eid];
		const actionTimerAttribute = playerData.attributes.actionTimer;
		actionTimerAttribute.currentValue =
			actionTimerAttribute.maximumValue = 0;
		playerData.queuedAction = null;
	});
}

export function disposeEnemyEntities() {
	const gameplayState = getGameplayState();
	const world = getGameScene().world;
	gameplayState.enemyEntityIds.forEach((eid) => {
		removeEntity(world, eid);
	});
}

export function setSelectedCharacter(eid: EntityId, isCombatMode?: boolean) {
	const gameplayState = getGameplayState();

	if (!gameplayState.playerEntityIds.includes(eid)) {
		return;
	}

	const playerGuiComponentArray = getPlayerGuiComponentArray();

	gameplayState.selectedPlayerEID = eid;
	playerGuiComponentArray.forEach((gui, eid) => {
		if (eid === gameplayState.selectedPlayerEID) {
			gui.setSelected(true);
		} else {
			gui.setSelected(false);
		}
	});

	if (isCombatMode) {
		resetCombatModeControls();
		resetCombatModeActionManager();
	}
}
