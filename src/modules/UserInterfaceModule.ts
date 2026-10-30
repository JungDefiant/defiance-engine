import {
    Color3,
    MeshBuilder,
    StandardMaterial,
    Texture,
    UniversalCamera,
    Vector3,
} from "@babylonjs/core";
import {
    AdvancedDynamicTexture,
    Button,
    Control,
    Image,
    TextBlock,
} from "@babylonjs/gui";
import CombatHUD from "src/gui/CombatHUD";
import DialogueHUD from "src/gui/DialogueHUD";
import ExploreHUD from "src/gui/ExploreHUD";
import PartyInfoHUD from "src/gui/PartyInfoHUD";
import { GameOverScreen } from "src/gui/screens/GameOverScreen";
import { ModalScreen } from "src/gui/screens/ModalScreen";
import { TacticalPauseScreen } from "src/gui/screens/TacticalPauseScreen";
import { UserInterfaceScene } from "src/scenes/UserInterfaceScene";
import UserInterfaceState, {
    UserInterfaceStateProps,
} from "src/states/UserInterfaceState";
import {
    getCampaignState,
    getGameplayState,
    getGameScene,
    getGameStateRegistry,
    getUserInterfaceScene,
    getUserInterfaceState,
} from "./GameStateModule";
import { CreateTypography, Themes } from "src/gui/Themes";
import { GameScene } from "src/scenes/GameScene";
import { getPublicRoot } from "./Utils";
import { GameMode, LoadedModalJson } from "src/types/GameTypes";
import { playSFX } from "./AudioModule";
import { getActorStateComponentArray } from "./ComponentModule";
import { getActorPosition } from "./Collision3DModule";
import { TARGET_HIGHLIGHT_DIAMETER } from "src/constants/CombatConstants";
import { ACTOR_GROUND_Y } from "src/constants/GeneralConstants";

export async function loadModalMap(modalIds: string[]): Promise<void> {
    const campaignState = getCampaignState();
    const userInterfaceState = getUserInterfaceState();

    modalIds.forEach(async (ref) => {
        const response = await fetch(
            `${getPublicRoot()}/data/${campaignState.campaignId}/modals/${ref}.json`,
        );
        const modalJson = (await response.json()) as LoadedModalJson;

        if (!modalJson) {
            return;
        }

        userInterfaceState.modalMap.set(modalJson.id, modalJson);
    });
}

export async function clearSceneGUI() {
    const userInterfaceState = getUserInterfaceState();
    userInterfaceState.sceneGUI.getChildren().forEach((control) => {
        control.dispose();
    });
}

function createMainUI(uiScene: UserInterfaceScene) {
    const mainUI = AdvancedDynamicTexture.CreateFullscreenUI(
        "ui_main",
        true,
        uiScene,
        Texture.NEAREST_SAMPLINGMODE,
    );
    mainUI.idealWidth = 1000;
    mainUI.idealHeight = 752;
    return mainUI;
}

function createSceneUI(scene: GameScene) {
    const sceneGUI = AdvancedDynamicTexture.CreateFullscreenUI(
        "ui_scene",
        true,
        scene,
        Texture.NEAREST_SAMPLINGMODE,
    );
    sceneGUI.idealWidth = 1000;
    sceneGUI.idealHeight = 752;
    return sceneGUI;
}

function createUICamera(uiScene: UserInterfaceScene) {
    const uiCamera = new UniversalCamera("cam_gui", Vector3.Zero(), uiScene);
    uiCamera.attachControl(false);
    return uiCamera;
}

function createGameOverScreen(mainUI: AdvancedDynamicTexture) {
    const gameOverScreen = new GameOverScreen();
    mainUI.addControl(gameOverScreen.getRoot());
    gameOverScreen.showHide(false);
    return gameOverScreen;
}

function createModalScreen(mainUI: AdvancedDynamicTexture) {
    const modalScreen = new ModalScreen();
    mainUI.addControl(modalScreen.getRoot());
    return modalScreen;
}

function createDialogueHUD(mainUI: AdvancedDynamicTexture) {
    const dialogueHud = new DialogueHUD();
    mainUI.addControl(dialogueHud.createHudRoot());
    dialogueHud.showHideHud(false);
    return dialogueHud;
}

function createPartyInfoHUD(mainUI: AdvancedDynamicTexture) {
    const partyInfoHud = new PartyInfoHUD();
    mainUI.addControl(partyInfoHud.createHudRoot());
    return partyInfoHud;
}

function createTacticalPauseScreen(mainUI: AdvancedDynamicTexture) {
    const tacticalPauseScreen = new TacticalPauseScreen();
    mainUI.addControl(tacticalPauseScreen.getRoot());
    tacticalPauseScreen.showHide(false);
    return tacticalPauseScreen;
}

function createCombatHUD(mainUI: AdvancedDynamicTexture) {
    const combatHud = new CombatHUD();
    mainUI.addControl(combatHud.createHudRoot());
    combatHud.showHideHud(false);
    return combatHud;
}

function createExploreHUD(mainUI: AdvancedDynamicTexture) {
    const exploreHud = new ExploreHUD();
    mainUI.addControl(exploreHud.createHudRoot());
    exploreHud.showHideHud(false);
    return exploreHud;
}

interface ButtonProps {
    isCentered: boolean;
    text?: string;
    imageUrl?: string;
    sfxId?: string;
    sfxBaseUrl?: string;
}

export function createButton(name: string, props: ButtonProps): Button {
    const newButton = new Button(name);

    if (props.sfxId && props.sfxBaseUrl) {
        const sfxId = props.sfxId;
        const sfxBaseUrl = props.sfxBaseUrl;
        newButton.onPointerClickObservable.add(() => {
            playSFX(sfxId, sfxBaseUrl);
        });
    }

    if (props.imageUrl) {
        const iconImage = new Image(name + "_icon", props.imageUrl);
        if (props.text) {
            iconImage.width = "20%";
            iconImage.stretch = Image.STRETCH_UNIFORM;
        } else {
            iconImage.stretch = Image.STRETCH_FILL;
        }
        iconImage.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        newButton.addControl(iconImage);
    }

    if (props.text) {
        const textBlock = new TextBlock(name + "_text", props.text);
        textBlock.textWrapping = true;
        textBlock.textHorizontalAlignment = props.isCentered
            ? Control.HORIZONTAL_ALIGNMENT_CENTER
            : Control.HORIZONTAL_ALIGNMENT_LEFT;
        newButton.addControl(textBlock);
    }

    return newButton;
}

export function createUserInterfaceState() {
    const userInterfaceScene = getUserInterfaceScene();
    const uiCamera = createUICamera(userInterfaceScene);
    userInterfaceScene.activeCamera = uiCamera;
    const mainUI = createMainUI(userInterfaceScene);
    const sceneUI = createSceneUI(getGameScene());
    CreateTypography(mainUI);
    document.fonts.ready.then(() => {
        mainUI.markAsDirty();
    });
    document.fonts.ready.then(() => {
        sceneUI.markAsDirty();
    });
    const exploreHud = createExploreHUD(mainUI);
    const combatHud = createCombatHUD(mainUI);
    const tacticalPauseScreen = createTacticalPauseScreen(mainUI);
    const partyInfoHud = createPartyInfoHUD(mainUI);
    const dialogueHud = createDialogueHUD(mainUI);
    const modalScreen = createModalScreen(mainUI);
    const gameOverScreen = createGameOverScreen(mainUI);
    const newUserInterfaceState = new UserInterfaceState({
        mainUI,
        sceneUI,
        exploreHud,
        combatHud,
        tacticalPauseScreen,
        partyInfoHud,
        dialogueHud,
        modalScreen,
        gameOverScreen,
    } as UserInterfaceStateProps);
    getGameStateRegistry().registerNewGameState(
        UserInterfaceState.name,
        newUserInterfaceState,
    );
    return newUserInterfaceState;
}

export function clearCombatHudEntries() {
    const userInterfaceState = getUserInterfaceState();
    userInterfaceState.combatHud.clearCombatEntries();
}

export function setUserInterfaceGameMode(newMode: GameMode) {
    const userInterfaceState = getUserInterfaceState();
    userInterfaceState.partyInfoHud.showHideHud(
        newMode === "Combat" || newMode === "Explore",
    );
    userInterfaceState.exploreHud.showHideHud(newMode === "Explore");
    userInterfaceState.dialogueHud.showHideHud(newMode === "Dialogue");
    userInterfaceState.combatHud.showHideHud(newMode === "Combat");
}

export function showModal(modalId: string) {
    const userInterfaceState = getUserInterfaceState();
    const modalData = userInterfaceState.modalMap.get(modalId);
    if (!modalData) {
        return;
    }
    userInterfaceState.modalScreen.setNewPages(modalData.pages);
    userInterfaceState.modalScreen.showHide(true);
}

export function updateTargetHighlight(): void {
    const gameScene = getGameScene();
    const gameplayState = getGameplayState();
    const userInterfaceState = getUserInterfaceState();
    const actorStateComponentArray = getActorStateComponentArray();

    const targetEid =
        actorStateComponentArray[gameplayState.selectedPlayerEID]
            .currentTargetEntityId;
    const targetActorState =
        targetEid >= 0 ? actorStateComponentArray[targetEid] : undefined;
    const targetPosition = targetEid >= 0 ? getActorPosition(targetEid) : null;
    let targetHighlightMesh = userInterfaceState.targetHighlightMesh;

    if (!targetActorState || targetActorState.isDefeated || !targetPosition) {
        if (targetHighlightMesh) {
            targetHighlightMesh.setEnabled(false);
        }
        return;
    }

    if (!targetHighlightMesh) {
        targetHighlightMesh = MeshBuilder.CreateTorus(
            "targetHighlight",
            {
                diameter: TARGET_HIGHLIGHT_DIAMETER,
                thickness: 0.04,
                tessellation: 24,
            },
            gameScene,
        );
        targetHighlightMesh.isPickable = false;

        const highlightMaterial = new StandardMaterial(
            "mat_targetHighlight",
            gameScene,
        );
        highlightMaterial.diffuseColor = Color3.FromHexString(
            Themes.secondary3,
        );
        highlightMaterial.emissiveColor = Color3.FromHexString(
            Themes.secondary3,
        );
        highlightMaterial.disableLighting = true;
        targetHighlightMesh.material = highlightMaterial;

        userInterfaceState.targetHighlightMesh = targetHighlightMesh;
    }

    targetHighlightMesh.setEnabled(true);
    targetHighlightMesh.position.copyFrom(targetPosition);
    targetHighlightMesh.position.y = ACTOR_GROUND_Y + 0.02;
}
