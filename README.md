# APOCALYPSE//SIM

Eight ways to end the world, on a neon globe. Pick a disaster, pick where it starts, and watch it play out.

**Play it:** https://apocalypse-simulator.onrender.com

| Mode | What happens |
|---|---|
| ☣ Plague | A pathogen spreads by flights, ships and land; hospitals overflow, lockdowns and quarantines follow |
| ☄ Meteor | Pick the size and target; crater, fireball, tsunami, impact winter |
| 🌐 Super Quake | A great fault ruptures; shaking, collapse, tsunami, aftershocks |
| 🧟 Zombies | Outbreak, hordes, refugees fleeing by land, sea and air, and the slow collapse of order |
| 🌋 Supervolcano | Yellowstone, Toba, Campi Flegrei and more; ashfall and volcanic winter |
| ☢ Reactor Meltdown | Choose a plant; the plume drifts with the winds |
| 🌾 Crop Failure | Wheat rust, rice blast, late blight… or the *Interstellar* Blight |
| 🧊 Ice Caps Melt | North, South or both, slow to extreme; the new coastline is drawn in red from real elevation data |

> **For fun, not a forecast.** The models use real physics and data where they can (impact scaling, sea-level curves, elevation, population), but they are simplified for a browser toy. Don't plan your bunker around them.

## Run it locally

No build step, no dependencies to install. Serve the folder with any static server:

```bash
python -m http.server 8791
```

Then open http://localhost:8791. (Opening `index.html` straight from disk won't work, because the browser blocks the data fetches.)

Add `?trailer` to the URL to play the music-synced trailer.

## Contributing

Ideas, fixes and new apocalypses are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Map and charts: [D3](https://d3js.org) and [topojson-client](https://github.com/topojson/topojson-client) (ISC licence)
- World borders: [world-atlas](https://github.com/topojson/world-atlas) (ISC), from [Natural Earth](https://www.naturalearthdata.com) (public domain)
- Elevation for the ice-melt mode: [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), built by Mapzen from SRTM, GMTED2010, ETOPO1 and other sources; see their [attribution list](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
- Built with help from Claude (Anthropic)

## Licence

The code is released under the [MIT licence](LICENSE).

**The trailer music (`Trailer Music - Apocalypse SIM edit.mp3`) is not covered by the MIT licence.** It is © dvdlots73-gif, all rights reserved. It may be played as part of this project, but please don't reuse it elsewhere.
