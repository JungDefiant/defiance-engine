import { CreateSoundAsync, CreateStreamingSoundAsync } from "@babylonjs/core";
import AudioState from "src/states/AudioState";
import CampaignState from "src/states/CampaignState";
import { SystemRegistry } from "src/states/registries/SystemRegistry";
import { container } from "tsyringe";

export async function playSFX(id: string) {
	const systemRegistry = container.resolve(SystemRegistry);
	const audioState = systemRegistry.getGameSystemBySystemId();
	const campaignState = container.resolve(CampaignState);
	if (!audioState.audioEngine || !campaignState) {
		return;
	}

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
