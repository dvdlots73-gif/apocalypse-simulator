# Contributing to APOCALYPSE//SIM

Thanks for wanting to help end the world.

## Ways to help

- **Report a bug or a silly number.** Open an issue with what you did, what you expected and what happened. Screenshots help. If a figure looks wrong (deaths, crater size, sea level), link a source if you have one.
- **Suggest a new apocalypse.** Open an issue describing how it starts, how it spreads and how it ends. Real science or a well-known film premise both work.
- **Send a fix or a feature.** Fork the repo, make a branch, and open a pull request.

## How the code is laid out

- `index.html`: the page, the globe (D3 orthographic projection on a canvas), the shared HUD, the event log and the mode switching.
- One file per disaster: `meteor.js`, `quake.js`, `volcano.js`, `reactor.js`, `zombie.js`, `crop.js`, `ice.js`. Quake, volcano and reactor reuse the shared disaster engine in `meteor.js`.
- `trailer.js`: the music-synced trailer (`?trailer`).

To add a mode, follow an existing one: add a menu button in `index.html`, give it `…Tick`, `…Draw` and `…Hud` functions in its own file, and hook it into the dispatch in `index.html` the way `crop` and `ice` are.

## Ground rules

- **No build step and no npm dependencies.** It runs from a plain static server. Libraries come from a CDN with a pinned version.
- **Keep it small and readable.** Plain JavaScript, matching the style of the file you're in. No frameworks.
- **Numbers should be defensible.** Cite your source in the pull request when you change a model.
- **Test in a browser** (`python -m http.server 8791`) and check the mode you touched still runs from start to end.
- **Keep it in good taste.** Disasters, yes. Real people, real tragedies played for laughs, or anything that reads as instructions for causing harm, no.

By contributing, you agree your code is released under the project's [MIT licence](LICENSE).
