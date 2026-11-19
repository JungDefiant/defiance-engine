import {
    AbstractAssetTask,
    AssetsManager,
    Nullable,
    Scene,
} from "@babylonjs/core";
import {
    AssetManifest,
    AssetProgressCallback,
    FontDef,
    ManifestAbilityJson,
    ManifestActorJson,
    ManifestCollector,
    ManifestModalJson,
    ManifestStickerJson,
} from "src/types/AssetTypes";
import { FONT_DEFS, STATIC_GUI_IMAGE_URLS } from "src/constants/AssetConstants";
import { getPublicRoot } from "./Utils";
import type {
    LoadedCampaignJson,
    LoadedSceneJson,
} from "src/types/GameTypes";

class PreloadAssetsManager extends AssetsManager {
    public addCustomTask(task: AbstractAssetTask): void {
        this._tasks.push(task);
    }
}

class WarmGuiImageTask extends AbstractAssetTask {
    private readonly url: string;

    public constructor(name: string, url: string) {
        super(name);
        this.url = url;
    }

    public runTask(
        _scene: Scene,
        onSuccess: () => void,
        onError: (message?: string) => void,
    ): void {
        warmGuiImage(this.url).then((isLoaded) => {
            if (isLoaded) {
                onSuccess();
                return;
            }
            onError(`Failed to warm image: ${this.url}`);
        });
    }
}

export async function preloadMainMenuAssets(): Promise<void> {
    await Promise.all(STATIC_GUI_IMAGE_URLS.map((url) => warmGuiImage(url)));
}

export async function preloadFonts(): Promise<void> {
    const fontLoadPromises = FONT_DEFS.map((fontDef: FontDef) => {
        return loadFontFace(fontDef);
    });
    await Promise.all(fontLoadPromises);
}

export async function buildAssetManifest(
    campaignId: string,
): Promise<AssetManifest> {
    const collector = createManifestCollector();
    const actorJsons: ManifestActorJson[] = [];

    const campaignUrl = toDataUrl(`campaigns/${campaignId}/campaign.json`);
    collector.dataUrls.add(campaignUrl);
    const campaignJson = await loadJson<LoadedCampaignJson>(campaignUrl);
    if (!campaignJson) {
        return toAssetManifest(collector);
    }

    const sceneUrl = toDataUrl(
        `campaigns/${campaignId}/scenes/${campaignJson.startSceneId}.json`,
    );
    collector.dataUrls.add(sceneUrl);
    const sceneJson = await loadJson<LoadedSceneJson>(sceneUrl);
    if (sceneJson) {
        await collectSceneAssets(campaignId, sceneJson, collector, actorJsons);
    }
    await collectPartyActors(
        campaignId,
        campaignJson.startingPartyIds,
        collector,
        actorJsons,
    );

    const stickerIds = new Set<string>();
    const abilityIds = new Set<string>();
    for (const actorJson of actorJsons) {
        collectActorAssets(actorJson, collector, abilityIds);
    }
    await collectAbilityAssets(abilityIds, collector, stickerIds);
    await collectStickerAssets(stickerIds, collector);

    return toAssetManifest(collector);
}

export async function preloadAssets(
    hostScene: Scene,
    manifest: AssetManifest,
    onProgress?: AssetProgressCallback,
): Promise<void> {
    const assetsManager = new PreloadAssetsManager(hostScene);
    assetsManager.useDefaultLoadingScreen = false;

    manifest.guiImageUrls.forEach((url, index) => {
        assetsManager.addCustomTask(
            new WarmGuiImageTask(`warmGuiImage_${index}`, url),
        );
    });

    const textureTasks = manifest.textureUrls.map((url, index) => {
        return assetsManager.addTextureTask(`texture_${index}`, url);
    });

    manifest.dataUrls.forEach((url, index) => {
        assetsManager.addTextFileTask(`data_${index}`, url);
    });

    manifest.binaryUrls.forEach((url, index) => {
        assetsManager.addBinaryFileTask(`binary_${index}`, url);
    });

    if (onProgress) {
        assetsManager.onProgress = (remainingCount, totalCount) => {
            onProgress(totalCount - remainingCount, totalCount);
        };
    }

    try {
        await assetsManager.loadAsync();
    } catch (error) {
        console.error("Asset preloading completed with errors", error);
    }

    disposeWarmedTextures(textureTasks);
}

async function collectSceneAssets(
    campaignId: string,
    sceneJson: LoadedSceneJson,
    collector: ManifestCollector,
    actorJsons: ManifestActorJson[],
): Promise<void> {
    if (sceneJson.dialogueFileId) {
        collector.dataUrls.add(
            toDataUrl(
                `campaigns/${campaignId}/dialogues/${sceneJson.dialogueFileId}.txt`,
            ),
        );
    }
    if (sceneJson.startMusicId) {
        collector.binaryUrls.add(
            `${getPublicRoot()}/data/audio/music/${sceneJson.startMusicId}`,
        );
    }
    for (const modalId of sceneJson.modalIds) {
        await collectModalAssets(campaignId, modalId, collector);
    }
    await collectEncounterActors(
        campaignId,
        sceneJson.encounters,
        collector,
        actorJsons,
    );
}

async function collectModalAssets(
    campaignId: string,
    modalId: string,
    collector: ManifestCollector,
): Promise<void> {
    const modalUrl = toDataUrl(
        `campaigns/${campaignId}/modals/${modalId}.json`,
    );
    collector.dataUrls.add(modalUrl);
    const modalJson = await loadJson<ManifestModalJson>(modalUrl);
    if (!modalJson) {
        return;
    }
    for (const page of modalJson.pages || []) {
        if (!page.imageSrc) {
            continue;
        }
        collector.guiImageUrls.add(`${getPublicRoot()}/${page.imageSrc}`);
    }
}

async function collectEncounterActors(
    campaignId: string,
    encounters: { [index: string]: string[] },
    collector: ManifestCollector,
    actorJsons: ManifestActorJson[],
): Promise<void> {
    const enemyIds = new Set<string>();
    for (const enemyIdList of Object.values(encounters)) {
        for (const enemyId of enemyIdList) {
            enemyIds.add(enemyId);
        }
    }
    for (const enemyId of enemyIds) {
        const enemyUrl = toDataUrl(
            `campaigns/${campaignId}/enemies/${enemyId}.json`,
        );
        collector.dataUrls.add(enemyUrl);
        const enemyJson = await loadJson<ManifestActorJson>(enemyUrl);
        if (enemyJson) {
            actorJsons.push(enemyJson);
        }
    }
}

async function collectPartyActors(
    campaignId: string,
    partyIds: string[],
    collector: ManifestCollector,
    actorJsons: ManifestActorJson[],
): Promise<void> {
    const uniquePartyIds = new Set(partyIds);
    for (const partyId of uniquePartyIds) {
        const partyUrl = toDataUrl(
            `campaigns/${campaignId}/playableChars/${partyId}.json`,
        );
        collector.dataUrls.add(partyUrl);
        const actorJson = await loadJson<ManifestActorJson>(partyUrl);
        if (actorJson) {
            actorJsons.push(actorJson);
        }
    }
}

function collectActorAssets(
    actorJson: ManifestActorJson,
    collector: ManifestCollector,
    abilityIds: Set<string>,
): void {
    if (actorJson.spriteUrl) {
        const spriteUrl = `${getPublicRoot()}/sprites/characters/${actorJson.spriteUrl}`;
        collector.guiImageUrls.add(spriteUrl);
        collector.textureUrls.add(spriteUrl);
    }
    if (actorJson.weaponId) {
        abilityIds.add(`weapons/${actorJson.weaponId}`);
    }
    if (actorJson.mutationId) {
        abilityIds.add(`powers/${actorJson.mutationId}`);
    }
    if (actorJson.equipment1Id) {
        abilityIds.add(`powers/${actorJson.equipment1Id}`);
    }
    if (actorJson.equipment2Id) {
        abilityIds.add(`powers/${actorJson.equipment2Id}`);
    }
    for (const featId of actorJson.featIds || []) {
        abilityIds.add(`feats/${featId}`);
    }
}

async function collectAbilityAssets(
    abilityIds: Set<string>,
    collector: ManifestCollector,
    stickerIds: Set<string>,
): Promise<void> {
    const processedAbilityIds = new Set<string>();
    let pendingAbilityIds = [...abilityIds];

    while (pendingAbilityIds.length > 0) {
        const nextAbilityIds: string[] = [];
        for (const abilityId of pendingAbilityIds) {
            if (processedAbilityIds.has(abilityId)) {
                continue;
            }
            processedAbilityIds.add(abilityId);

            const abilityUrl = toDataUrl(`abilities/${abilityId}.json`);
            collector.dataUrls.add(abilityUrl);
            const abilityJson = await loadJson<ManifestAbilityJson>(
                abilityUrl,
            );
            if (!abilityJson) {
                continue;
            }
            collectAbilityImages(
                abilityJson,
                collector,
                stickerIds,
                nextAbilityIds,
            );
        }
        pendingAbilityIds = nextAbilityIds;
    }
}

function collectAbilityImages(
    abilityJson: ManifestAbilityJson,
    collector: ManifestCollector,
    stickerIds: Set<string>,
    nextAbilityIds: string[],
): void {
    if (abilityJson.iconURL) {
        collector.guiImageUrls.add(`${getPublicRoot()}/${abilityJson.iconURL}`);
    }
    if (abilityJson.castVfxURL) {
        stickerIds.add(abilityJson.castVfxURL);
    }
    if (abilityJson.hitVfxURL) {
        stickerIds.add(abilityJson.hitVfxURL);
    }
    if (abilityJson.castSfxURL) {
        collector.binaryUrls.add(
            `${getPublicRoot()}/data/audio/sfx/${abilityJson.castSfxURL}`,
        );
    }
    if (abilityJson.hitSfxURL) {
        collector.binaryUrls.add(
            `${getPublicRoot()}/data/audio/sfx/${abilityJson.hitSfxURL}`,
        );
    }
    if (abilityJson.associatedAbility) {
        nextAbilityIds.push(`powers/${abilityJson.associatedAbility}`);
    }
}

async function collectStickerAssets(
    stickerIds: Set<string>,
    collector: ManifestCollector,
): Promise<void> {
    for (const stickerId of stickerIds) {
        const stickerUrl = toDataUrl(`stickers/${stickerId}.json`);
        collector.dataUrls.add(stickerUrl);
        const stickerJson = await loadJson<ManifestStickerJson>(stickerUrl);
        if (!stickerJson || !stickerJson.source) {
            continue;
        }
        collector.guiImageUrls.add(`${getPublicRoot()}/${stickerJson.source}`);
    }
}

function disposeWarmedTextures(
    textureTasks: { texture: Nullable<{ dispose: () => void }> }[],
): void {
    for (const textureTask of textureTasks) {
        if (textureTask.texture) {
            textureTask.texture.dispose();
        }
    }
}

async function loadFontFace(fontDef: FontDef): Promise<void> {
    const fontFace = new FontFace(fontDef.family, `url("${fontDef.url}")`);
    const loadedFontFace = await fontFace.load();
    document.fonts.add(loadedFontFace);
}

function warmGuiImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = url;
    });
}

function toDataUrl(path: string): string {
    return `${getPublicRoot()}/data/${path}`;
}

async function loadJson<T>(url: string): Promise<Nullable<T>> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Failed to load manifest data", url, error);
        return null;
    }
}

function createManifestCollector(): ManifestCollector {
    return {
        guiImageUrls: new Set<string>(STATIC_GUI_IMAGE_URLS),
        textureUrls: new Set<string>(),
        dataUrls: new Set<string>(),
        binaryUrls: new Set<string>(),
    };
}

function toAssetManifest(collector: ManifestCollector): AssetManifest {
    return {
        guiImageUrls: [...collector.guiImageUrls],
        textureUrls: [...collector.textureUrls],
        dataUrls: [...collector.dataUrls],
        binaryUrls: [...collector.binaryUrls],
    };
}
