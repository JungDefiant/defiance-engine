# AGENTS.md

## General

- Be less dramatic in chat outputs

## Setup commands

- Install dependencies: `npm install`
- Start game: `npm run dev`

## Code style

- TypeScript strict mode
- Double quotes
- Don't add comments
- Composition over inheritance
- Semicolons at the end of every function/method call or variable assignment/declaration
- Use let and const, never var
- Use if statements instead of ternary operators
- Prefer to use "early outs"
- Create a new Processor (src/processors) in place of a switch statement
- Create a new System (src/systems) when adding new code to be run every frame
- Avoid "special cases" in the update() function of Systems; if there is a condition based on an enum or type property of a Component, then create a Processor instead
- Avoid adding variables at the top level of a file; move to one of the src/types files or create a new file under src/types if none of the existing files make sense for the variable
    - If the variable is a constant, then move to one of the src/constants files or create a new file under src/constants of none of the existing files make sense for the variable
- If a function in a Module is only used in a single System, then refactor the function into a private method of that System
- Avoid having long functions; separate code into smaller functions or refactor existing functions to be more abstract
- Prefer interfaces and types over classes, unless the object is a System or Factory
- If an object needs to be prefabricated, then create a Factory for that object
- Round all measurements up to the nearest multiple of 4, unless it is 1 or 2
