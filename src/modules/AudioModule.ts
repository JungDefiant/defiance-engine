import { CreateSoundAsync, CreateStreamingSoundAsync } from "@babylonjs/core";
import { getAudioState, getCampaignState } from "./GameStateModule";

export async function playSFX(id: string) {
	const audioState = getAudioState();
	const campaignState = getCampaignState();

	let sound = audioState.sfxMap.get(id);
	if (!sound) {
		sound = await CreateSoundAsync(
			id,
			`data/${campaignState.campaignId}/audio/sfx/${id}`,
		);
		audioState.sfxMap.set(id, sound);
	}

	await audioState.audioEngine.unlockAsync();
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
