export interface AssetManifest {
    guiImageUrls: string[];
    textureUrls: string[];
    dataUrls: string[];
    binaryUrls: string[];
}

export type AssetProgressCallback = (
    loadedCount: number,
    totalCount: number,
) => void;

export interface ManifestCollector {
    guiImageUrls: Set<string>;
    textureUrls: Set<string>;
    dataUrls: Set<string>;
    binaryUrls: Set<string>;
}

export interface ManifestActorJson {
    spriteUrl?: string;
    weaponId?: string;
    mutationId?: string;
    equipment1Id?: string;
    equipment2Id?: string;
    featIds?: string[];
}

export interface ManifestAbilityJson {
    iconURL?: string;
    castVfxURL?: string;
    hitVfxURL?: string;
    castSfxURL?: string;
    hitSfxURL?: string;
    associatedAbility?: string;
}

export interface ManifestStickerJson {
    source?: string;
}

export interface ManifestModalJson {
    pages?: ManifestModalPage[];
}

export interface ManifestModalPage {
    imageSrc?: string;
}

export interface FontDef {
    family: string;
    url: string;
}
