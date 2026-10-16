# input-copy

Original: `registry/default/input-copy.tsx`, demo in `app/docs/input-copy/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/input-copy.tsx`,
demo in `src/demos/input-copy.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## The result glyph pops in with a scale

- **Cause:** `gpuix gap`. No transforms (README "Missing features", scale-in entrances row, which lists input-copy): source `scale` 0.6 to 1 on the check and cross, 0.8 on the copy icon (`input-copy.tsx:155,183,211`), port fades only (`input-copy.tsx:48-57`).

## The swap has no exit, and the first mount fades in

- **Cause:** `not ported yet`.
- **Original:** `AnimatePresence mode="wait" initial={false}` (`input-copy.tsx:150-221,223-337`): the old glyph or label animates out (`exit` opacity 0, scale 0.8) before the new one enters, and nothing animates on the first mount.
- **Port:** `Swap` remounts its children when `${status}-${copyCount}` changes and fades the new ones in (`input-copy.tsx:45-65`). The old glyph is gone at once, and the initial `opacity: 0` also plays when the component first mounts, so the idle copy icon fades in on page load.
- **Workaround:** the key includes `copyCount`, so copying again while "Copied" shows replays the fade.
- **Fidelity:** approximated. `AnimatePresence` with `mode="wait"` exists in the fork (`~/code/fdarian/gpuix/FORK.md:826-827`).
- **Components it hits:** input-message (`SendButton`, see its file).

## The check and cross do not draw themselves, and are other glyphs

- **Cause:** `not ported yet`.
- **Original:** custom paths `M6 12L10 16L18 8` and `M9 9L15 15M15 9L9 15` in `viewBox="2 4 20 16"` at 14px, `pathLength` 0 to 1 in 0.08 s ease-out (`input-copy.tsx:164-208,250-262,288-300`). The scale is 0.7, so the check is about 8.4px wide, the cross 4.2px, and the idle stroke 1.5 is 1.05px (2 is 1.4px).
- **Port:** the static `check` and `x` glyphs of the Icons row's library (lucide by default, `icons/lucide.ts:6-7`) through `Icon` at 14px of a 24 box, scale 0.583 (`input-copy.tsx:147-187`): a 9.3px check, a 7px cross, 0.875px idle stroke.
- **Workaround:** none here. `CheckMark` (`lib/icon.tsx:41`) already draws a path with `motion.path` for select and combobox, and the fork animates `pathLength` (`FORK.md:829`).
- **Fidelity:** approximated (static, larger cross, thinner strokes).
- **Components it hits:** just this one.

## The value tint switches on at once

- **Cause:** `gpuix gap`.
- **Original:** the `<mark>` carries `transition-colors duration-80` (`input-copy.tsx:351`), so the `bg-[#6B97FF]/20` tint fades in and out over 80 ms on hover. The glyph and label colours ease the same way on the action cell (`:226,330`).
- **Port:** the glyph and label colours do ease (`Icon fade`, `colorFade` on the label `<text>`, `src/components/input-copy.tsx:190-198,236`). The tint is a `highlight` wash on the value `<text>` (`:261-270`), set while hovered, and appears and disappears on the first frame.
- **gpuix lacks:** a transition for the `highlight` wash. It is painted as its own quad from the `highlight` prop (`~/code/fdarian/gpuix/README.md:3993-4090`), not from the element's style, so `transition*` never sees it.
- **Workaround:** none.
- **Fidelity:** approximated (the tint switches instead of easing; the glyph and label fade).
- **Components it hits:** just this one.

## Icon stroke 1.5 to 2 on hover applies to the wrong glyphs in the button variant

- **Cause:** `not ported yet`.
- **Original:** the stroke eases over 80 ms (`input-copy.tsx:159,187,217`). In the `button` variant only the copy icon changes with hover (`:317`); the check and cross are fixed at `strokeWidth={2}` (`:250,288`).
- **Port:** one `strokeWidth={hovered() ? 2 : 1.5}` for every glyph in both variants (`input-copy.tsx:186-193`), so the button variant's check and cross draw at 1.5 at rest. The ease itself is ported: `<Icon easeStroke>` (`src/lib/icon.tsx`) draws the glyph's shapes in one `motion.g` and animates its `strokeWidth` over 80 ms on Tailwind's curve.
- **Fidelity:** approximated.

## The value tint has a corner radius

- **Cause:** `port choice` (reason not stated).
- **Original:** `<mark>` with `bg-[#6B97FF]/20`, no radius (`input-copy.tsx:351`).
- **Port:** `highlight` with `radius: 2` (`input-copy.tsx:261-270`). How tall the tinted box is next to an inline `<mark>` was not compared.
- **Fidelity:** approximated.

## The monospace face is Menlo

- **Cause:** `port choice` (reason not stated).
- **Original:** Tailwind `font-mono` (`input-copy.tsx:344`): `ui-monospace, SFMono-Regular, Menlo, …`, resolved by the browser. The site sets no `--font-mono` of its own.
- **Port:** `MONO = "Menlo"` (`input-copy.tsx:21,261`).
- **Fidelity:** approximated (same face in Chrome on macOS, not in Safari, where `ui-monospace` is SF Mono).

## The tooltip's "Copied" reset runs on the row, not the whole field

- **Cause:** `not ported yet`.
- **Original:** `onMouseEnter` / `onMouseLeave` sit on the wrapper, so entering the label re-arms the tooltip and leaving it closes a "Copied" one (`input-copy.tsx:138-140,399`).
- **Port:** the handlers are on the row (`input-copy.tsx:290-291`), so the label does not count. The press snapshot (`tooltipOpenAtPress`) is read from the tooltip's `onOpenChange` like the source's ref, and a keyboard press reuses the last pointer snapshot as the source does.
- **Fidelity:** approximated (label hover only).

## The label is not part of the accessible name

- **Cause:** `not ported yet`.
- **Original:** `aria-labelledby={`${buttonId} ${labelId}`}` with `aria-label` "Copy" when a label is set, so the name reads "Copy <label>" (`input-copy.tsx:371-380`).
- **Port:** `aria-label` is "Copy to clipboard" whether or not a label is shown (`input-copy.tsx:280-286`); the label `<text>` is not referenced. gpuix accepts `aria-labelledby` (`FORK.md:455`).
- **Fidelity:** approximated.

## A refused write has no `execCommand` fallback

- **Cause:** `port choice` (a native window has no insecure context or permissions policy to fall back from, and gpuix has no `document.execCommand`).
- **Original:** `navigator.clipboard.writeText`, then an off-screen textarea and `execCommand("copy")` when that throws; the error state shows only if both fail (`input-copy.tsx:77-110`).
- **Port:** `navigator.clipboard.writeText(value)`; when it rejects the component shows the error state, as the source does when its fallback fails too (`input-copy.tsx:100-105`).
- **Workaround:** none.
- **Fidelity:** exact where the write succeeds; a refused write shows the error at once instead of trying a second way.

## Passthrough props

- **Cause:** `not ported yet`.
- **Original:** `...props`, `className` and `ref` go to the wrapper div (`input-copy.tsx:384`, `:396-401`).
- **Port:** no `className`, `ref` or rest props. The port adds `testId`. An omitted `size` follows the Size row (`input-copy.tsx:89`).
- **Fidelity:** dropped.
- **Components it hits:** every component with `size` (input-group, input-message).

## Static weights

- **Cause:** `gpuix gap`. Source `fontVariationSettings` 400 with `opsz` 14 on the value and the label (`input-copy.tsx:231,349,411`): see README "Missing features", variable-font row.

## Demo page

- **Cause:** `port choice` (the demo is a showcase card, not a docs page; reason not stated beyond that).
- **Original:** `app/docs/input-copy/page.tsx`: Basic, With Label, Button Variant, Left Aligned (icon and button, `gap-4`), Disabled, Copy Callback (`gap-2` to a caption with `px-1`), each in a `ComponentPreview` with its code, then a props table.
- **Port:** all six variants exist (`src/demos/input-copy.tsx:37-101`), stacked in one card at `gap: 8` (`:36`), the callback caption at `gap: 4` (`:87`). Extra: "Compact". The code snippets and props table are not ported.
- **Fidelity:** all source variants present; one extra.
