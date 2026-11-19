import {
	AdvancedDynamicTexture,
	Control,
	Rectangle,
	TextBlock,
} from "@babylonjs/gui";
import { Scene, Texture } from "@babylonjs/core";
import { Themes } from "../Themes";
import { clamp } from "src/modules/Utils";

export class LoadingScreen {
	private readonly root: AdvancedDynamicTexture;
	private readonly rootContainer: Rectangle;
	private readonly progressFillUI: Rectangle;
	private readonly progressLabelUI: TextBlock;
	private readonly trackWidthInPixels: number = 512;

	public constructor(scene: Scene) {
		this.root = AdvancedDynamicTexture.CreateFullscreenUI(
			"ui_loadingScreen",
			true,
			scene,
			Texture.NEAREST_SAMPLINGMODE,
		);
		this.root.idealWidth = 1280;
		this.root.idealHeight = 960;

		this.rootContainer = new Rectangle("ui_loadingScreenRoot");
		this.rootContainer.width = 1;
		this.rootContainer.height = 1;
		this.rootContainer.thickness = 0;
		this.rootContainer.background = Themes.primary3;
		this.rootContainer.isVisible = false;
		this.root.addControl(this.rootContainer);

		const statusLabelUI = new TextBlock(
			"ui_loadingStatusLabel",
			"LOADING",
		);
		statusLabelUI.color = Themes.neutral2;
		statusLabelUI.style = Themes.typography.header1;
		statusLabelUI.heightInPixels = 48;
		statusLabelUI.topInPixels = -72;
		statusLabelUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		statusLabelUI.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		this.rootContainer.addControl(statusLabelUI);

		const progressTrackUI = new Rectangle("ui_loadingProgressTrack");
		progressTrackUI.widthInPixels = this.trackWidthInPixels;
		progressTrackUI.heightInPixels = 16;
		progressTrackUI.thickness = 1;
		progressTrackUI.color = Themes.primary1;
		progressTrackUI.background = Themes.primary3;
		progressTrackUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		progressTrackUI.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		this.rootContainer.addControl(progressTrackUI);

		this.progressFillUI = new Rectangle("ui_loadingProgressFill");
		this.progressFillUI.widthInPixels = 4;
		this.progressFillUI.heightInPixels = 8;
		this.progressFillUI.thickness = 0;
		this.progressFillUI.background = Themes.secondary2;
		this.progressFillUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.progressFillUI.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		progressTrackUI.addControl(this.progressFillUI);

		this.progressLabelUI = new TextBlock(
			"ui_loadingProgressLabel",
			"0%",
		);
		this.progressLabelUI.color = Themes.neutral2;
		this.progressLabelUI.style = Themes.typography.header3;
		this.progressLabelUI.heightInPixels = 24;
		this.progressLabelUI.topInPixels = 32;
		this.progressLabelUI.horizontalAlignment =
			Control.HORIZONTAL_ALIGNMENT_CENTER;
		this.progressLabelUI.verticalAlignment =
			Control.VERTICAL_ALIGNMENT_CENTER;
		this.rootContainer.addControl(this.progressLabelUI);
	}

	public show(): void {
		this.rootContainer.isVisible = true;
		this.setProgress(0, 1);
	}

	public hide(): void {
		this.rootContainer.isVisible = false;
	}

	public setProgress(loadedCount: number, totalCount: number): void {
		if (totalCount <= 0) {
			return;
		}
		this.progressFillUI.widthInPixels = this.getFillWidthInPixels(
			loadedCount,
			totalCount,
		);
		const percent = Math.round((loadedCount / totalCount) * 100);
		this.progressLabelUI.text = `${percent}%`;
	}

	private getFillWidthInPixels(
		loadedCount: number,
		totalCount: number,
	): number {
		const fillRatio = clamp(loadedCount / totalCount, 0, 1);
		const rawWidth = fillRatio * this.trackWidthInPixels;
		return Math.max(4, Math.ceil(rawWidth / 4) * 4);
	}
}
