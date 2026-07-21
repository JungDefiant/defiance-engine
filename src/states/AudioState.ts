import {
	AudioEngineV2,
	CreateAudioEngineAsync,
	Nullable,
	StaticSound,
	StreamingSound,
} from "@babylonjs/core";
import { singleton } from "tsyringe";

@singleton()
export default class AudioState {
	public audioEngine: Nullable<AudioEngineV2> = null;
	public readonly sfxMap: Map<string, StaticSound> = new Map();
	public readonly musicMap: Map<string, StreamingSound> = new Map();

	constructor() {
		(async () => {
			this.audioEngine = await CreateAudioEngineAsync();
			this.audioEngine.unlockAsync();
		})();
	}
}
