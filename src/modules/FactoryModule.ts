import { PlayerFactory } from "src/factories/PlayerFactory";
import { getGameScene } from "./GameStateModule";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { StickerFactory } from "src/factories/StickerFactory";

export function getEnemyFactory(): EnemyFactory {
	return getGameScene().factoryRegistry.getEntityFactoryByFactoryId<EnemyFactory>(
		EnemyFactory.toString(),
	);
}

export function getPlayerFactory(): PlayerFactory {
	return getGameScene().factoryRegistry.getEntityFactoryByFactoryId<PlayerFactory>(
		PlayerFactory.toString(),
	);
}

export function getStickerFactory(): StickerFactory {
	return getGameScene().factoryRegistry.getEntityFactoryByFactoryId<StickerFactory>(
		StickerFactory.toString(),
	);
}
