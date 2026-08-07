import { singleton } from "tsyringe";

singleton();
export class GameStateRegistry {
	private gameStates: Map<string, GameState> = new Map();

	public registerNewGameState(systemId: string, newSystem: GameState) {
		this.gameStates.set(systemId, newSystem);
	}

	public getAllGameStates(): Map<string, GameState> {
		return this.gameStates;
	}

	public getGameStateByStateId<T>(systemId: string): T {
		return this.gameStates.get(systemId) as T;
	}
}

export interface GameState {}
