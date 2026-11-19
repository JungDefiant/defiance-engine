# Defiance Engine

## Description

Defiance Engine is a TypeScript BabylonJS + Vite engine for isometric CRPG's inspired by early 2000's Bioware games.

Built from BabylonJS + Vite boilerplate: https://github.com/paganaye/babylonjs-vite-boilerplate

## Packages

- _BabylonJS:_ Game engine
- _Vite:_ Frontend build tool
- _OhmJS:_ Custom text parser

## Instructions

- clone or download the repo
- npm install
- For development: `npm run dev`
- For production: `npm run build` then to preview what was built `npm run preview`

## File Structure

### src/components

This folder contains definitions for data-only classes processed by systems and attached to entities.

### src/factories

This folder contains factory classes for creating prefab entities.

### src/gui

This folder contains objects for rendering GUI, using [BabylonGUI](https://doc.babylonjs.com/features/featuresDeepDive/gui/gui).

### src/processors

This folder contains processor classes for running functions tied to specific enum types.

### src/modules

This folder contains standalone functions used in multiple areas of code.

### src/registries

This folder contains registries for singleton objects, including factories, processors, and systems.

### src/scenes

This folder contains classes defining scenes loaded into the game.

### src/states

This folder contains objects for holding global state.

### src/systems

This folder contains system classes for processing components attached to entities per-frame.

### src/types

This folder contains files for defining interfaces, schemas, custom types, and enums.


