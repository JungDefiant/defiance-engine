import { CreateSoundAsync, CreateStreamingSoundAsync } from "@babylonjs/core";
import AudioState from "src/states/AudioState";
import GameState from "src/states/GameState";
import { container } from "tsyringe";

export async function playSFX(id: string) {
	const as = container.resolve(AudioState);
	const gs = container.resolve(GameState);
	if (!as.audioEngine || !gs) {
		return;
	}

	let sound = as.sfxMap.get(id);
	if (!sound) {
		sound = await CreateSoundAsync(
			id,
			`data/${gs.campaignId}/audio/sfx/${id}`,
		);
		as.sfxMap.set(id, sound);
	}

	await as.audioEngine.unlockAsync();
	sound.play();
}

export async function playMusic(id: string, gameState?: GameState) {
	const as = container.resolve(AudioState);
	const gs = gameState || container.resolve(GameState);

	if (!as.audioEngine || !gs) {
		return;
	}

	let music = as.musicMap.get(id);
	if (!music) {
		music = await CreateStreamingSoundAsync(
			id,
			`data/${gs.campaignId}/audio/music/${id}`,
			{
				loop: true,
			},
		);
		as.musicMap.set(id, music);
	}

	await as.audioEngine.unlockAsync();
	if (as.currentMusic) {
		as.currentMusic.stop();
	}
	as.currentMusic = music;
	music.play();
}
