import { PlayerFactory } from "src/factories/PlayerFactory";
import { EnemyFactory } from "src/factories/EnemyFactory";
import { StickerFactory } from "src/factories/StickerFactory";
import { container } from "tsyringe";
import { FactoryRegistry } from "src/registries/FactoryRegistry";
import { ProjectileFactory } from "src/factories/ProjectileFactory";
import { RenderQueueFactory } from "src/factories/RenderQueueFactory";

export function getFactoryRegistry() {
	return container.resolve(FactoryRegistry);
}

export function getEnemyFactory(): EnemyFactory {
	return getFactoryRegistry().getEntityFactoryByFactoryId<EnemyFactory>(
		EnemyFactory.name,
	);
}

export function getPlayerFactory(): PlayerFactory {
	return getFactoryRegistry().getEntityFactoryByFactoryId<PlayerFactory>(
		PlayerFactory.name,
	);
}

export function getStickerFactory(): StickerFactory {
	return getFactoryRegistry().getEntityFactoryByFactoryId<StickerFactory>(
		StickerFactory.name,
	);
}

export function getProjectileFactory(): ProjectileFactory {
	return getFactoryRegistry().getEntityFactoryByFactoryId<ProjectileFactory>(
		ProjectileFactory.name,
	);
}

export function getRenderQueueFactory(): RenderQueueFactory {
	return getFactoryRegistry().getEntityFactoryByFactoryId<RenderQueueFactory>(
		RenderQueueFactory.name,
	);
}
