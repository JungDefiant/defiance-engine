import {
	AudioEngineV2,
	Nullable,
	StaticSound,
	StreamingSound,
} from "@babylonjs/core";
import { singleton } from "tsyringe";

@singleton()
export default class AudioState {
	public audioEngine: Nullable<AudioEngineV2> = null;
	public currentMusic: Nullable<StreamingSound> = null;
	public readonly sfxMap: Map<string, StaticSound> = new Map();
	public readonly musicMap: Map<string, StreamingSound> = new Map();

	constructor(newAudioEngine: AudioEngineV2) {
		this.audioEngine = newAudioEngine;
	}
}
