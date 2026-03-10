import { Nullable } from "@babylonjs/core";
import { AdvancedDynamicTexture, Container } from "@babylonjs/gui";

export default interface IHUD {
  rootContainer: Nullable<Container>;
  createHUD(fullscreen: AdvancedDynamicTexture): void;
  showHideHud(show: boolean): void;
}
