import { CreateSoundAsync, CreateStreamingSoundAsync } from "@babylonjs/core";
import { getAudioState, getCampaignState } from "./GameStateModule";
import AudioState from "src/states/AudioState";

export async function playSFX(sfxId: string, baseUrl: string) {
	const audioState = getAudioState();
	let sound = audioState && audioState.sfxMap.get(sfxId);
	if (!sound) {
		sound = await CreateSoundAsync(sfxId, `${baseUrl}/${sfxId}`);
	}

	if (audioState) {
		if (!audioState.sfxMap.has(sfxId)) {
			audioState.sfxMap.set(sfxId, sound);
		}
		await audioState.audioEngine.unlockAsync();
	}
	sound.play();
}

export async function playMusic(musicId: string) {
	const audioState = getAudioState();
	const campaignState = getCampaignState();

	let music = audioState.musicMap.get(musicId);
	if (!music) {
		music = await CreateStreamingSoundAsync(
			musicId,
			`data/${campaignState.campaignId}/audio/music/${musicId}`,
			{
				loop: true,
			},
		);
		audioState.musicMap.set(musicId, music);
	}

	await audioState.audioEngine.unlockAsync();
	if (audioState.currentMusic) {
		audioState.currentMusic.stop();
	}
	audioState.currentMusic = music;
	music.play();
}
