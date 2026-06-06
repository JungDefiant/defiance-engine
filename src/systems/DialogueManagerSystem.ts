import { container, singleton } from "tsyringe";
import grammar from "src/parser/DialogueParser.ohm-bundle";
import {
	AbstractMesh,
	UniversalCamera,
	Vector3,
	Viewport,
} from "@babylonjs/core";
import SceneManagerSystem from "src/systems/SceneManagerSystem";
import GameState, { GameMode } from "src/GameState";
import DialogueHUD from "src/gui/DialogueHUD";

import type ISystem from "src/systems/ISystem";
import type { DialogueSemantics } from "src/parser/DialogueParser.ohm-bundle";
import type { InteractableData } from "src/GameState";
import type { Nullable, TransformNode } from "@babylonjs/core";

@singleton()
export default class DialogueManagerSystem implements ISystem {
	private dialogueMap: Map<string, DialogueNode> = new Map<
		string,
		DialogueNode
	>();
	private activeDialogue: Nullable<DialogueNode> = null;
	private semantics: Nullable<DialogueSemantics> = null;

	public async start() {
		this.initSemantics();
	}

	public update(deltaTime: number) {}

	public initSemantics() {
		this.semantics = grammar.createSemantics();

		this.semantics.addOperation<DialogueNode[]>("eval()", {
			DialogueData(nodes) {
				return nodes.children.map((node) => {
					return node.getNode();
				});
			},
		});

		this.semantics.addOperation<DialogueNode>("getNode()", {
			Node(node, _, lines, __) {
				return {
					name: node.sourceString,
					lines: lines.children.flatMap((line) => {
						switch (line.ctorName) {
							case "Line":
							case "Options":
							case "Cmd":
								return [line.getLine()];
							default:
								return [];
						}
					}) as DialogueLine[],
				} as DialogueNode;
			},
		});

		this.semantics.addOperation<DialogueLine>("getLine()", {
			Line(_, char, __, txt) {
				return {
					type: "Line",
					character: char.getString(),
					text: txt.getString(),
				} as DialogueLine;
			},
			Options(options) {
				return {
					type: "Options",
					options: options.children.map((choice) => {
						const text = choice.child(1).getString();
						const moveto = choice.child(2).getString();
						return { text, destinationNode: moveto } as DialogueOptionLine;
					}),
				} as DialogueLine;
			},
			Cmd(_, cmd) {
				return cmd.getLine();
			},
			SetVar(cmd, var1, var2) {
				return {
					type: "Cmd",
					cmd: cmd.sourceString,
					vars: [var1.child(1).sourceString, var2.child(1).sourceString],
				};
			},
			MoveCam(cmd, var1, var2) {
				return {
					type: "Cmd",
					cmd: cmd.sourceString,
					vars: [var1.getVector(), var2.getVector()],
				};
			},
		});

		this.semantics.addOperation<string>("getString()", {
			String(_) {
				return this.sourceString;
			},
			StringVar(_, str, __) {
				return str.sourceString;
			},
			MoveToNode(_, dest, __) {
				return dest.sourceString;
			},
		});

		this.semantics.addOperation<number>("getNumber()", {
			Number(_) {
				return parseFloat(this.sourceString);
			},
			NumberVar(_, num, __) {
				return parseFloat(num.sourceString);
			},
		});

		this.semantics.addOperation<Vector3>("getVector3()", {
			Vector(_, x, __, y, ___, z, _____) {
				return new Vector3(x.getNumber(), y.getNumber(), z.getNumber());
			},
		});
	}

	public async loadDialogueMap(dlgId: string): Promise<void> {
		if (!this.semantics) {
			return;
		}

		const gameState = container.resolve(GameState);

		const response = await fetch(
			`data/${gameState.campaignId}/dialogues/${dlgId}.txt`,
		);
		const rawData = await response.text();
		if (!rawData) {
			return;
		}

		const matchResult = grammar.match(String.raw`${rawData}`);
		if (matchResult.failed()) {
			console.error("Match Result failed", matchResult.message);
		} else if (matchResult.succeeded()) {
			const dialogueNodes = this.semantics(
				matchResult,
			).eval() as DialogueNode[];
			dialogueNodes.forEach((node) => {
				this.dialogueMap.set(node.name, node);
			});
		}
	}

	public async startDialogue(
		node: string,
		itr: {
			data: InteractableData;
			itrNode: TransformNode;
			viewNode: TransformNode;
		},
	): Promise<void> {
		if (!this.dialogueMap.has(node)) {
			return;
		}

		const smSystem = container.resolve(SceneManagerSystem);
		const dlgHud = container.resolve(GameState).dialogueHud;
		const camera = container.resolve(GameState).scene
			.activeCamera as UniversalCamera;

		camera.position = itr.viewNode.absolutePosition;
		// TO DO: Implement moving camera to target over time
		camera.setTarget(itr.itrNode.absolutePosition);

		smSystem.setGameMode(GameMode.Dialogue);
		dlgHud.clearEntryStacks();

		this.startDialogueNode(node);
	}

	public startDialogueNode(node: string) {
		if (!this.dialogueMap.has(node)) {
			return;
		}

		const dialogueData = this.dialogueMap.get(node) as DialogueNode;
		this.activeDialogue = dialogueData;
		this.runLine(0);
	}

	public runLine(id: number) {
		// Get dialogue HUD
		if (!this.activeDialogue) {
			return;
		}

		const dlgHud = container.resolve(GameState).dialogueHud;
		const line = this.activeDialogue.lines[id];

		if (!dlgHud) {
			return;
		}

		if (!line) {
			dlgHud.addExitEntry();
			return;
		}

		switch (line.type) {
			case "Line":
				this.displayTextLine(id, line, dlgHud);
			case "Options":
				this.displayOptionsLine(line, dlgHud);
		}
	}

	public endDialogue() {
		// Switch mode back to Explore
		const smSystem = container.resolve(SceneManagerSystem);
		const gameState = container.resolve(GameState);
		const camera = gameState.scene.activeCamera as UniversalCamera;
		const locData = gameState.locationData;

		smSystem.setGameMode(GameMode.Explore);
	}

	private displayTextLine(id: number, line: DialogueLine, dlgHud: DialogueHUD) {
		if (!line.text) {
			return;
		}

		let charData;
		const character = line.character;
		if (character) {
			// Gets sprite in the scene matching the character name
			// Moves camera to target the sprite
		}

		if (line.text) {
			// Display text entry for dialogue
			dlgHud.addTextDialogueEntry(line);
		}

		const nextLineId = id + 1;
		const nextLine = this.activeDialogue?.lines[nextLineId];
		if (!nextLine) {
			dlgHud.addExitEntry();
		} else if (nextLine.type === "Options") {
			this.runLine(nextLineId);
		} else {
			dlgHud.addContinueEntry(id, nextLineId);
		}
	}

	private displayOptionsLine(line: DialogueLine, dlgHud: DialogueHUD) {
		if (!line.options) {
			return;
		}

		const options = line.options;
		if (!options || options.length < 1) {
			// Set end dialogue button
			console.warn("No options found, exiting dialogue");
			dlgHud.addExitEntry();
		} else {
			// Set choices GUI
			dlgHud.addChoiceEntries(options);
		}
	}

	// COMMANDS
	private setFlag(flag: string) {}

	private setStringVariable(name: string, value: string) {}

	private setNumberVariable(name: string, value: number) {}

	private moveCamera(position: Vector3, target: Vector3) {}

	private setSpeaker(charId: string) {}

	private playSound(soundUrl: string) {}

	private triggerCombat(encounterId: string) {}
}

export interface DialogueNode {
	name: string;
	lines: DialogueLine[];
}

export interface DialogueLine {
	type: "Line" | "Options" | "Cmd";
	character?: string;
	text?: string;
	options?: DialogueOptionLine[];
	cmd?: string;
	vars?: (string | number | Vector3)[];
}

export interface DialogueOptionLine {
	text: string;
	destinationNode: string;
}
