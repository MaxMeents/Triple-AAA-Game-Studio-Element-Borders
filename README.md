# AAA Game Studio — Animated Border Showcase

50 production-grade, animated border effects designed to look like they
belong in a Triple-A game UI. Pure HTML / CSS / vanilla JS — no build step.

## Run

Just open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
Works directly from the filesystem or from your WAMP server.

## File layout

```
index.html                  # Showcase page (grid of 50 squares)
css/
  base.css                  # Layout, theme, shared keyframes
  borders-01-10.css         # Effects  1 – 10
  borders-11-20.css         # Effects 11 – 20
  borders-21-30.css         # Effects 21 – 30
  borders-31-40.css         # Effects 31 – 40
  borders-41-50.css         # Effects 41 – 50
js/
  effects.js                # Ordered list of the 50 effect names
  app.js                    # Builds the grid, filter, canvas particles
```

## The 50 Effects

| # | Name | # | Name |
|---|------|---|------|
| 01 | Neon Pulse       | 26 | Demonic Sigil    |
| 02 | Plasma Arc       | 27 | Aurora Borealis  |
| 03 | Cyber Circuit    | 28 | Sonic Wave       |
| 04 | Dragon Fire      | 29 | Molten Gold      |
| 05 | Holographic Shift| 30 | Radioactive      |
| 06 | Quantum Flux     | 31 | Starlight        |
| 07 | Void Rift        | 32 | Binary Stream    |
| 08 | Golden Crown     | 33 | Blood Moon       |
| 09 | Blood Oath       | 34 | Venom Strike     |
| 10 | Ice Shard        | 35 | Ethereal Wisp    |
| 11 | Electric Storm   | 36 | Thunder Strike   |
| 12 | Shadow Realm     | 37 | Crystal Growth   |
| 13 | Phoenix Rising   | 38 | Smoke Veil       |
| 14 | Nebula Dust      | 39 | Prismatic Edge   |
| 15 | Energy Shield    | 40 | Stealth Cloak    |
| 16 | Chromatic Pulse  | 41 | Sacred Flame     |
| 17 | Runic Seal       | 42 | Glitch Matrix    |
| 18 | Laser Grid       | 43 | Acid Etch        |
| 19 | Toxic Sludge     | 44 | Stardust Trail   |
| 20 | Celestial Aura   | 45 | Chronos Ring     |
| 21 | Magma Core       | 46 | Diamond Cut      |
| 22 | Arctic Frost     | 47 | Mystic Scroll    |
| 23 | Spectral Mist    | 48 | Inferno Ring     |
| 24 | Crystal Lattice  | 49 | Liquid Metal     |
| 25 | Warp Drive       | 50 | Apex Legend      |

## Reusing a border in your own project

1. Include `css/base.css` (defines the `--angle` custom property and a few
   shared keyframes) plus the relevant `borders-XX-YY.css` file.
2. Add the matching class to any element, e.g.:

```html
<div class="square b27"><div class="inner">Hello</div></div>
```

Most effects use a `::before` / `::after` rim technique with
`-webkit-mask-composite`, which works in all current evergreen browsers.

## Notes / browser support

- Uses `@property --angle` for smooth conic-gradient rotation (Chromium,
  Safari 16.4+, Firefox 128+). In older browsers those borders fall back
  to a static gradient — every other effect still animates.
- No external dependencies.
