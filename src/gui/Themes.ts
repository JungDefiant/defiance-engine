import { AdvancedDynamicTexture, Style } from "@babylonjs/gui";

export function CreateTypography(adt: AdvancedDynamicTexture) {
	const newFonts = [
		new FontFace("ComicSans", 'url("src/assets/fonts/comic-sans.ttf")'),
		new FontFace("RobotoMono", 'url("src/assets/fonts/roboto-mono-med.ttf")'),
		new FontFace(
			"KurlandRegular",
			'url("src/assets/fonts/kurland-regular.otf")',
		),
	];

	newFonts.forEach((val) => {
		document.fonts.add(val);
		val.load();
	});

	const captionStyle = adt.createStyle();
	captionStyle.fontFamily = "ComicSans";
	captionStyle.fontSize = 10;
	Themes.typography.caption = captionStyle;

	const bodyTextStyle = adt.createStyle();
	bodyTextStyle.fontFamily = "ComicSans";
	bodyTextStyle.fontSize = 14;
	Themes.typography.bodyText = bodyTextStyle;

	const header4Style = adt.createStyle();
	header4Style.fontFamily = "RobotoMono";
	header4Style.fontWeight = "normal";
	header4Style.fontSize = 14;
	Themes.typography.header4 = header4Style;

	const header3Style = adt.createStyle();
	header3Style.fontFamily = "RobotoMono";
	header3Style.fontWeight = "normal";
	header3Style.fontSize = 24;
	Themes.typography.header3 = header4Style;

	const header2Style = adt.createStyle();
	header2Style.fontFamily = "RobotoMono";
	header2Style.fontWeight = "semibold";
	header2Style.fontSize = 36;
	Themes.typography.header2 = header2Style;

	const header1Style = adt.createStyle();
	header1Style.fontFamily = "KurlandRegular";
	header1Style.fontSize = 48;
	Themes.typography.header1 = header1Style;

	const titleStyle = adt.createStyle();
	titleStyle.fontFamily = "KurlandRegular";
	titleStyle.fontSize = 64;
	Themes.typography.title = titleStyle;
}

export const Themes = {
	primary1: "#24468E",
	primary2: "#2B7BBB",
	primary3: "#2A2828",
	secondary1: "#A4D6E3",
	secondary2: "#EFC041",
	secondary3: "#DC3D46",
	neutral1: "#8C9A97",
	neutral2: "#FDFFFF",
	neutral3: "#94B5DA",
	success: "#00A841",
	warning: "#FCE400",
	error: "#ED145B",
	dialogueBackgroundOpacity: "AA",
	tacticalPauseOpacity: "22",
	textButtonDefaultOpacity: "AA",
	textButtonHighlightOpacity: "FF",
	typography: {
		caption: {} as Style,
		bodyText: {} as Style,
		header4: {} as Style,
		header3: {} as Style,
		header2: {} as Style,
		header1: {} as Style,
		title: {} as Style,
	},
};
