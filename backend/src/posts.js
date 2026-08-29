export const POST_TYPE = Object.freeze({
  NONE: "none",
  HOSTED: "hosted",
  PLAYABLE: "playable",
})

export const alienAttack = {
  id: "alien-attack",
  type: POST_TYPE.PLAYABLE,
  title: "Alien Attack",
  shortDescription:
    "A fast-paced wave-based shooter where you pilot a plane and defend against waves of alien birds.",
  hosted: {
    url: "https://alien-bird-shooter.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
Alien Attack is a wave-based arcade shooter built with p5.js. Pilot your plane, dodge falling eggs, collect boosts, and survive endless waves of alien birds.

## Gameplay

- Shoot down enemy birds with your plane's cannon
- Dodge eggs dropped by enemies as they fall
- Pick up boosts to power up your attack
- A shield protects you for a limited time

## Controls

- **Move** - Drag the mouse to steer your plane
- **Shoot** - Click to fire, or hold for continuous fire
- **Pause** - Press \`ESC\`

## Features

- Infinite wave-based levels with increasing difficulty
- Wave and round messages keep you in the action
- Player stats: score, lives (3), and boost count
- Built with p5.js and styled with Tailwind CSS

## Tech Stack

- **p5.js** - rendering and game loop
- **JavaScript (ES modules)** - modular code: entities, handlers, levels, collisions
- **Tailwind CSS** - UI styling`,
  github: "https://github.com/AbhayPratapSingh1/alien-shooter",
  dateOfCreation: 1785989806,
};

export const loxJava = {
  id: "lox-java",
  type: POST_TYPE.PLAYABLE,
  title: "Lox in Java",
  shortDescription:
    "A web-based interpreter for the Lox programming language, implemented in Java following Crafting Interpreters.",
  hosted: {
    url: "https://lox-web-java.onrender.com/",
    plateForm: "Render",
  },
  availableAt: ["web"],
  description: `
Lox in Java is a full implementation of the Lox programming language from the book *Crafting Interpreters*, running right in your browser.

## Features

- Full Lox syntax: variables, control flow, functions, and classes
- Closures and environments
- Static analysis with a resolver
- Tree-walking interpreter written in Java
- Try it live and see errors reported in real time

## Tech Stack

- **Java** - interpreter implementation (scanner, parser, resolver, interpreter)
- **Web** - hosted on Render for browser access`,
  github: "https://github.com/AbhayPratapSingh1/lox-web-java",
  dateOfCreation: 1778473951,
};

export const fallBall = {
  id: "fall-ball",
  type: POST_TYPE.PLAYABLE,
  title: "Fall Ball",
  shortDescription:
    "A ball keeps falling - land it safely on the bars, but watch out, some bars break!",
  hosted: {
    url: "https://falling-ball-io.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
Fall Ball is a simple but addictive arcade game. The ball never stops falling - your job is to keep it bouncing on the bars and survive as long as you can.

## Gameplay

- The ball constantly falls toward the ground
- Land on bars to keep the ball alive
- Some bars break over time - don't trust every platform!
- Survive as long as possible and beat your best score

## Features

- Endless falling action
- Breakable bars add strategy and tension
- Built with JavaScript

## Tech Stack

- **JavaScript** - game logic and rendering
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/fall-ball",
  dateOfCreation: 1767933151,
};

export const highwayCar = {
  id: "highway-car",
  type: POST_TYPE.PLAYABLE,
  title: "Highway Car",
  shortDescription:
    "A 3D highway car movement demo built from scratch in p5.js.",
  hosted: {
    url: "https://highway-car.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
Highway Car is a 3D driving experience built from scratch in p5.js. No 3D libraries - just raw math and rendering.

## Features

- 3D road rendering with perspective math built from scratch
- Car movement and camera following
- Procedural highway environment
- Built entirely with p5.js primitives and matrix math

## Tech Stack

- **p5.js** - rendering
- **JavaScript** - 3D math, projection, and movement
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/highway-car",
  dateOfCreation: 1770957679,
};

export const rubixCube = {
  id: "rubix-cube",
  type: POST_TYPE.PLAYABLE,
  title: "Rubix Cube",
  shortDescription:
    "A fully interactive Rubik's Cube implementation built from scratch with 3D math.",
  hosted: {
    url: "https://rubix-cube-3d.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
Rubix Cube is an interactive 3D Rubik's Cube built from scratch - no cube libraries, just raw 3D math.

## Features

- Fully interactive 3D Rubik's Cube
- Rotate faces by dragging
- 3D rendering from scratch with projection math
- Rotate the whole cube to inspect it from any angle

## Tech Stack

- **JavaScript** - 3D engine and cube rotation logic
- **p5.js** - rendering
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/rubix-cube",
  dateOfCreation: 1771648879,
};

export const bomberMan = {
  id: "bomber-man",
  type: POST_TYPE.NONE,
  title: "Bomber Man",
  shortDescription:
    "A Bomberman-style game built with JavaScript.",
  availableAt: ["web"],
  description: `
Bomber Man is a classic Bomberman-style game built with JavaScript.

## Gameplay

- Place bombs to blow up obstacles
- Avoid enemy blast radius while hunting enemies
- Classic grid-based arena gameplay

## Tech Stack

- **JavaScript** - game logic and rendering`,
  github: "https://github.com/AbhayPratapSingh1/bomber-man",
  dateOfCreation: 1761021679,
};

export const threeDShapes = {
  id: "3d-shapes",
  type: POST_TYPE.PLAYABLE,
  title: "3D Shapes",
  shortDescription:
    "A custom 3D engine built with mathematics and p5.js for rendering shapes in space.",
  hosted: {
    url: "https://3d-space-space.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
3D Shapes is a custom 3D engine built using mathematics and p5.js - rendering shapes in 3D space from scratch.

## Features

- Custom 3D engine with projection and rotation math
- Multiple 3D shapes rendered in space
- Built from the ground up without 3D libraries

## Tech Stack

- **p5.js** - rendering
- **JavaScript** - 3D engine and math
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/3d-shapes",
  dateOfCreation: 1769920879,
};

export const lSystemTerminal = {
  id: "l-system-terminal",
  type: POST_TYPE.NONE,
  title: "L-System Terminal",
  shortDescription:
    "An L-system generator that renders fractal patterns, running in the terminal.",
  availableAt: ["web"],
  description: `
L-System Terminal is an L-system (Lindenmayer system) implementation that draws recursive fractal patterns.

## Features

- Generate classic L-system fractals with production rules
- Render patterns in the terminal
- Experiment with custom grammars

## Tech Stack

- **JavaScript** - L-system logic and rendering`,
  github: "https://github.com/AbhayPratapSingh1/l-system-terminal",
  dateOfCreation: 1771389679,
};

export const threeDShapesTerminal = {
  id: "3d-shapes-terminal",
  type: POST_TYPE.NONE,
  title: "3D Shapes Terminal",
  shortDescription:
    "A 3D engine rendering shapes in space, running in the terminal.",
  availableAt: ["web"],
  description: `
3D Shapes Terminal is a terminal-based 3D shape renderer built with JavaScript.

## Features

- Render 3D shapes in the terminal
- Rotation and projection math from scratch
- No external rendering libraries

## Tech Stack

- **JavaScript** - 3D math and terminal rendering`,
  github: "https://github.com/AbhayPratapSingh1/3d-shapes-Terminal",
  dateOfCreation: 1771389679,
};

export const flappyBird = {
  id: "flappy-bird",
  type: POST_TYPE.NONE,
  title: "Flappy Bird",
  shortDescription:
    "A Flappy Bird clone drawn on the p5.js canvas.",
  availableAt: ["web"],
  description: `
Flappy Bird is a classic flap-and-dodge game built on the p5.js canvas.

## Gameplay

- Tap or click to flap and stay airborne
- Dodge the pipes as you fly
- Survive as long as possible

## Tech Stack

- **p5.js** - canvas rendering and game loop
- **JavaScript** - game logic`,
  github: "https://github.com/AbhayPratapSingh1/flappy-bird",
  dateOfCreation: 1767674479,
};

export const mediaPipeDrawWithHand = {
  id: "media-pipe-draw-with-hand",
  type: POST_TYPE.NONE,
  title: "MediaPipe Draw with Hand",
  shortDescription:
    "Draw on screen using your hand gestures, powered by MediaPipe tracking.",
  availableAt: ["web"],
  description: `
MediaPipe Draw with Hand lets you draw on the screen using only your hand gestures.

## Features

- Real-time hand tracking with MediaPipe
- Draw by moving your finger in the air
- Touchless canvas interaction

## Tech Stack

- **MediaPipe** - hand landmark tracking
- **JavaScript** - canvas and gesture mapping`,
  github: "https://github.com/AbhayPratapSingh1/media-pipe-draw-with-hand",
  dateOfCreation: 1780548079,
};

export const dinoGesture = {
  id: "dino-gesture",
  type: POST_TYPE.PLAYABLE,
  title: "Dino Gesture",
  shortDescription:
    "Control the classic dino runner with hand gestures captured by the camera.",
  hosted: {
    url: "https://dino-gesture.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
Dino Gesture is a gesture-controlled dino runner game - jump and duck using hand movements in front of your camera.

## Gameplay

- Gesture to jump and duck
- Dodge incoming obstacles
- Camera-powered hand control

## Tech Stack

- **JavaScript** - game logic and gesture recognition
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/dino-gesture",
  dateOfCreation: 1776660359,
};

export const zombieHit3D = {
  id: "zombie-hit-3d",
  type: POST_TYPE.PLAYABLE,
  title: "Zombie Hit 3D",
  shortDescription:
    "A 3D zombie shooter where you aim and blast zombies in a first-person view.",
  hosted: {
    url: "https://zombie-hit-3d.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
Zombie Hit 3D is a first-person 3D zombie shooter you can play right in the browser.

## Gameplay

- Aim at zombies approaching from the dark
- Shoot to defend yourself
- Survive wave after wave

## Tech Stack

- **JavaScript** - 3D rendering and game logic
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/zombie-hit-3d",
  dateOfCreation: 1784522479,
};

export const threeDMaze = {
  id: "3d-maze",
  type: POST_TYPE.PLAYABLE,
  title: "3D Maze",
  shortDescription:
    "Explore and solve a maze rendered in 3D from a first-person perspective.",
  hosted: {
    url: "https://maze-in-3d.vercel.app/",
    plateForm: "Vercel",
  },
  availableAt: ["web"],
  description: `
3D Maze is a first-person 3D maze game where you navigate through procedurally generated walls.

## Gameplay

- Wander through a maze rendered in 3D
- Find your way to the exit
- Immersive first-person camera

## Tech Stack

- **JavaScript** - raycasting and maze generation
- **Vercel** - deployment`,
  github: "https://github.com/AbhayPratapSingh1/3d-maze",
  dateOfCreation: 1782794479,
};

export const mineSwapper = {
  id: "mine-swapper",
  type: POST_TYPE.NONE,
  title: "Mine Swapper",
  shortDescription:
    "A Mine Swapper game built in Python using cv2 and numpy.",
  availableAt: ["web"],
  description: `
Mine Swapper is a Minesweeper-inspired game built in Python using OpenCV (cv2) and numpy.

## Gameplay

- Reveal tiles and avoid the mines
- Use numbers to deduce where mines hide
- Flag suspected mines before they blow

## Tech Stack

- **Python** - game logic
- **cv2 (OpenCV)** - rendering
- **numpy** - grid and board handling`,
  github: "https://github.com/AbhayPratapSingh1/Mine-Swapper",
  dateOfCreation: 1721882479,
};

export const idCardGenerator = {
  id: "id-card-generator",
  type: POST_TYPE.NONE,
  title: "ID Card Generator",
  shortDescription:
    "A Python tool that generates ID cards dynamically.",
  availableAt: ["web"],
  description: `
ID Card Generator is a Python utility that creates ID cards from provided data.

## Features

- Generate ID cards with custom details
- Simple input, structured output
- Built for quick card generation workflows

## Tech Stack

- **Python** - logic and card generation`,
  github: "https://github.com/AbhayPratapSingh1/Id-Card-generator",
  dateOfCreation: 1716612079,
};