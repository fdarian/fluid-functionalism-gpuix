Why text weight goes through `fontVariationSettings`, why `StableLabel` keeps two hidden copies, and how the theme cross-fade works; read before touching `src/lib/theme.ts`, `stable-label.tsx` or `theme-fade.tsx`.

## Fonts

The app ships the two Inter 4.0 variable files the source serves (upright and italic, family `Inter Variable`, `assets/fonts/`). `weight` in `src/lib/theme.ts` holds the source's `fontWeights` strings, each `wght` paired with an `opsz` (`'wght' 550, 'opsz' 18` for semibold) so advance widths stay nearly constant as the weight changes.

- Use the token strings, not `fontWeight`, wherever the source uses `font-variation-settings`. Plain `fontWeight` is right only where the source uses a plain weight class (the shadcn recreations on Compare, the skill page's generic tabs and menu, the title-bar chrome). Mixing the two changes the optical size and so the advance widths.
- Ease the weight only where the source transitions it (80 ms, together with colour when the source's transition lists both). `StableLabel` eases by default; `snapWeight` is for rows the source draws without a weight transition (the surfaces page's role rows). Copy the source's transition list rather than easing because it is possible.
- Font smoothing is one declaration on the root (`WebkitFontSmoothing: 'antialiased'`, as the source sets on html and body); every text inherits it, no component sets it.

## StableLabel keeps two ghosts

`StableLabel` is an `inline-grid` holding the visible label and two hidden copies, normal and semibold, in one cell, so the cell is the wider of the two and never changes width with the weight. The source hides only a semibold copy, and its claim that semibold stays within 0.4 px of normal fails in Chromium too (Analytics grows 1.05 px; a long all-caps string shrinks 1.13 px), so a label whose semibold is narrower ("Pro plan" 51 to 50 px, "Toggle dark mode") shrinks when selected and nudges its neighbours there and here. The port holds the width instead. gpuix has no text-measure API, so a hidden `<text>` is the only way to do it.

- The reason is the box not moving, never cost. Do not drop the second ghost for speed. Its cost is recorded in the `stable-label.tsx` doc comment (within noise on gpuix `b03d4e27`, October 2026; a hidden text paints nothing and is not re-measured).
- `inline-grid` to `grid` on the wrapper does not help: the label sits in flex rows, so its items are blockified and retained either way.
- `scripts/check-weight-widths.tsx` asserts parity with the browser's delta, not the source's claim, and prints how many strings the claim misses. Parity tolerance is 0.03 px: the worst measured gap to the browser's table was 0.018 px, which is that table rounded to 0.01 px plus gpuix's 1/64 px on each width of the pair. A failure above it is a real width difference, so do not add slack. Its second half mounts every `StableLabel` user through its demo, steps the held motion clock across the ease and asserts the label's box and its neighbours' boxes are exactly where they were. It runs at scale 1, so widths at a retina display's 2x are not measured.

## Theme

System, Light and Dark are one `themeChoice` signal. Both columns of every `light-dark()` in the source's `globals.css` are kept as a token table (`color-mix()` mixed offline). "System" follows the OS through `createAppearance()`, and `renderer.setAppearance` mirrors an explicit Light or Dark so the native chrome follows. Default is System. Read tokens inside JSX or a function, never at module scope, or they freeze at one scheme.

The cross-fade is a transient universal layer (`src/lib/theme-fade.tsx`): a `UniversalStyle` (a gpuix `* {}` layer) listing the source's six properties for 180 ms, mounted, then the palette flips 20 ms later, then the layer is removed 200 ms after that.

- The lead frame is required: an element that first gains a `transition` in the same change as its colour jumps instead of easing.
- Only user actions fade. `changeTheme` is the user path; captures and tests call `setThemeChoice` and cut at once, and first paint never fades.
- `check-theme-fade` samples an SVG fill and stroke mid-fade. What drift still records is the source's `!important` and a same-frame start the layer cannot reproduce (`drift/site.md`).
