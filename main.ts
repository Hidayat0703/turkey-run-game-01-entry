// Gobble Run — hand-in program for the make.fun turkey-run-game-01 bounty
// (Node 22, standard library only).
//
// The entry itself is the game/ folder: plain static files that a desktop
// browser opens offline (game/index.html plus its ES modules — no library,
// no network). This program hands it in: it copies game/ and screenshots/
// from beside this file into the output directory and writes
// /output/dossier.json with buildDossier from the vendored make.fun
// library, byte for byte the dossier the gate rebuilds and compares.
//
// Run it locally the way the grader does, twice, and the bytes agree:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// Play the game first with: node serve.ts  (http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The whole game, as handed in: the playable files and the screenshots the
// judge's contact sheet is made from.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed to the dossier builder so an entry the scorer
// would refuse (a fifth screenshot, one screenshot over 256 KiB, a game/
// tree over 993 entries or 48 MiB, a path over 1,000 bytes) is refused
// here first instead.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
