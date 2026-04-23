# AAA Borders — AHK bundle & run

Standalone copy of the engine for black-box testing. One AutoHotkey v2
script bundles the entire site into a single self-contained HTML and
launches it in your default browser.

## Contents

- `src/` — verbatim copy of the engine source at build time
  - `src/index.html`
  - `src/css/*.css`
  - `src/js/**/*.js`
- `build_and_run.ahk` — bundler (AHK v2, no dependencies)
- `bundle.html` — generated output (single self-contained file)
- `build.log`   — per-run log of every file inlined

## Usage

1. Double-click `build_and_run.ahk` (requires
   [AutoHotkey v2](https://www.autohotkey.com/)).
2. The script reads `src/index.html`, inlines every referenced
   stylesheet (`<link rel="stylesheet" href="…">`) and script
   (`<script src="…"></script>`) as literal `<style>` / `<script>`
   blocks, then writes `bundle.html` next to itself.
3. `bundle.html` is opened in your default browser.

The resulting `bundle.html` has **no external dependencies** — you can
copy it anywhere (USB stick, email attachment, cloud drive) and it will
run offline.

## Rebuilding after changes

Re-run `build_and_run.ahk`. It always overwrites `bundle.html`. Check
`build.log` to see what was inlined and whether any referenced files
were missing.

## How the bundler works

The script is intentionally tiny. It uses two passes over the template:

1. **CSS pass** — regex `<link rel="stylesheet" href="X"/>` →
   `<style>/* X */ …file contents… </style>`.
2. **JS pass** — regex `<script src="X"></script>` →
   `<script>/* X */ …file contents… </script>`.

Each match's capture group is resolved relative to `src/`. Missing files
become HTML comments (`<!-- MISSING js FILE: foo.js -->`) so the bundle
still loads and the log flags them.

## Customising

- To change the output filename / location, edit the `OutFile := …`
  line near the top of `build_and_run.ahk`.
- To skip launching the browser automatically, comment out the
  `Run(OutFile)` line.
- To inline binary assets (fonts / images), extend `InlineTags` with an
  additional pass that base64-encodes the file and rewrites `url(...)`
  references — not needed here since the engine draws everything
  procedurally.
