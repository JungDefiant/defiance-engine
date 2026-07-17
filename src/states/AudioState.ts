import {
	AudioEngineV2,
	CreateAudioEngineAsync,
	Nullable,
	StaticSound,
} from "@babylonjs/core";
import { singleton } from "tsyringe";

@singleton()
export default class AudioState {
	public audioEngine: Nullable<AudioEngineV2> = null;
	public readonly sfxMap: Map<string, StaticSound> = new Map();

	constructor() {
		CreateAudioEngineAsync().then((newEngine) => {
			this.audioEngine = newEngine;
		});
	}
}
