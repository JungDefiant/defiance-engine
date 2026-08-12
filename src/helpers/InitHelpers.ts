import { Engine } from "@babylonjs/core";
import { container } from "tsyringe";

export function registerNewEngine(): Engine {
	const canvas = document.getElementById(
		"gameCanvas",
	)! as any as HTMLCanvasElement;
	const newEngine = new Engine(canvas);
	window.addEventListener("resize", () => {
		newEngine.resize();
	});
	container.register(Engine, { useValue: newEngine });
	return newEngine;
}
