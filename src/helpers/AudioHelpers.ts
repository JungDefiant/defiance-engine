import { CreateSoundAsync, CreateStreamingSoundAsync } from "@babylonjs/core";
import { GameStateRegistry } from "src/registries/GameStateRegistry";
import AudioState from "src/states/AudioState";
import CampaignState from "src/states/CampaignState";
import { container } from "tsyringe";

export async function playSFX(id: string) {
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const audioState = gameStateRegistry.getGameStateByStateId<AudioState>(
		AudioState.toString(),
	);
	const campaignState =
		gameStateRegistry.getGameStateByStateId<CampaignState>(
			CampaignState.toString(),
		);

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
	const gameStateRegistry = container.resolve(GameStateRegistry);
	const audioState = gameStateRegistry.getGameStateByStateId<AudioState>(
		AudioState.toString(),
	);
	const campaignState =
		gameStateRegistry.getGameStateByStateId<CampaignState>(
			CampaignState.toString(),
		);

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
