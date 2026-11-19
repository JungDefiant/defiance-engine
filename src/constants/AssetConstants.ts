import { getPublicRoot } from "src/modules/Utils";
import type { FontDef } from "src/types/AssetTypes";

export const STATIC_GUI_IMAGE_URLS = [
    `${getPublicRoot()}/sprites/gui/gui_mainmenu.png`,
    `${getPublicRoot()}/sprites/gui/icons/icon_interact.png`,
    `${getPublicRoot()}/sprites/gui/icons/icon_door.png`,
    `${getPublicRoot()}/sprites/gui/icons/icon_lastpage.png`,
    `${getPublicRoot()}/sprites/gui/icons/icon_nextpage.png`,
    `${getPublicRoot()}/sprites/gui/icons/icon_exit.png`,
    "/sprites/gui/icons/stats/icon_lifepoints.png",
    "/sprites/gui/icons/stats/icon_willpoints.png",
    `${getPublicRoot()}/sprites/dialogue/gui_textbox.png`,
    `${getPublicRoot()}/sprites/particles/magic_03.png`,
];

export const FONT_DEFS: FontDef[] = [
    { family: "ComicSans", url: "src/assets/fonts/comic-sans.ttf" },
    { family: "RobotoMono", url: "src/assets/fonts/roboto-mono-med.ttf" },
    { family: "KurlandRegular", url: "src/assets/fonts/kurland-regular.otf" },
];
