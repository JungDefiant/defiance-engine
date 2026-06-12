import { ICanvasRenderingContext, Nullable } from "@babylonjs/core";
import { StackPanel } from "@babylonjs/gui";

export default class StackPanelImage extends StackPanel {
	public source: string;

	public constructor(name: string, source: string) {
		super(name);
		this.source = source;
	}

	protected _localDraw(context: ICanvasRenderingContext): void {
		const image = new Image();
		image.src = this.source;
		image.addEventListener("load", () => {
			this._markAsDirty();
		});
		context.drawImage(
			image,
			this._currentMeasure.left,
			this._currentMeasure.top,
			this._currentMeasure.width,
			this._currentMeasure.height,
		);
	}
}
