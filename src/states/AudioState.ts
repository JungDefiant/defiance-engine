import {
	AudioEngineV2,
	Nullable,
	StaticSound,
	StreamingSound,
} from "@babylonjs/core";

export default class AudioState {
	public readonly audioEngine: AudioEngineV2;
	public readonly sfxMap: Map<string, StaticSound> = new Map();
	public readonly musicMap: Map<string, StreamingSound> = new Map();
	public currentMusic: Nullable<StreamingSound> = null;

	constructor(newAudioEngine: AudioEngineV2) {
		this.audioEngine = newAudioEngine;
	}
}
