import { singleton } from "tsyringe";

@singleton()
export class GameStateRegistry {
	private gameStates: Map<string, GameState> = new Map();

	public registerNewGameState(gameStateId: string, newGameState: GameState) {
		this.gameStates.set(gameStateId, newGameState);
	}

	public getAllGameStates(): Map<string, GameState> {
		return this.gameStates;
	}

	public getGameStateByStateId<T>(gameStateId: string): T {
		return this.gameStates.get(gameStateId) as T;
	}
}

export interface GameState {}
