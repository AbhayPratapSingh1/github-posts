export const POST_TYPE = Object.freeze({
  NONE: "none",
  HOSTED: "hosted",
  PLAYABLE: "playable",
})

export const POSTS = [
  {
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
  },
];

export const findPostById = (id) =>
  POSTS.find((post) => post.id === id) ?? null;