import GameSystem from "src/systems/GameSystem";
import { singleton } from "tsyringe";

export class SystemRegistry {
	private gameSystems: Map<string, GameSystem> = new Map();

	public registerNewGameSystem(systemId: string, newSystem: GameSystem) {
		this.gameSystems.set(systemId, newSystem);
	}

	public getAllGameSystems(): Map<string, GameSystem> {
		return this.gameSystems;
	}

	public getGameSystemBySystemId<T>(systemId: string): T {
		return this.gameSystems.get(systemId) as T;
	}
}
