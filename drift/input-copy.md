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
- **Port:** `Swap` remounts its children when `${status}-${copyCount}` changes and fades the new ones in (`input-copy.tsx:44-64`). The old glyph is gone at once, and the initial `opacity: 0` also plays when the component first mounts, so the idle copy icon fades in on page load.
- **Workaround:** the key includes `copyCount`, so copying again while "Copied" shows replays the fade.
- **Fidelity:** approximated. `AnimatePresence` with `mode="wait"` exists in the fork (`~/code/fdarian/gpuix/FORK.md:826-827`).
- **Components it hits:** input-message (`SendButton`, see its file).

## The check and cross do not draw themselves, and are other glyphs

- **Cause:** `not ported yet`.
- **Original:** custom paths `M6 12L10 16L18 8` and `M9 9L15 15M15 9L9 15` in `viewBox="2 4 20 16"` at 14px, `pathLength` 0 to 1 in 0.08 s ease-out (`input-copy.tsx:164-208,250-262,288-300`). The scale is 0.7, so the check is about 8.4px wide, the cross 4.2px, and the idle stroke 1.5 is 1.05px (2 is 1.4px).
- **Port:** the static lucide `check` and `x` (`icons.ts:5-6`) through `Icon` at 14px of a 24 box, scale 0.583 (`input-copy.tsx:153-193`): a 9.3px check, a 7px cross, 0.875px idle stroke.
- **Workaround:** none here. `CheckMark` (`lib/icon.tsx:41`) already draws a path with `motion.path` for select and combobox, and the fork animates `pathLength` (`FORK.md:829`).
- **Fidelity:** approximated (static, larger cross, thinner strokes).
- **Components it hits:** just this one.

## Hover colour changes are instant

- **Cause:** `not ported yet`.
- **Original:** `transition-colors duration-80` on the action cell (`input-copy.tsx:226,330`) and on the `<mark>` (`:351`), so the label, glyph and tint ease over 80 ms.
- **Port:** `hovered()` switches `color` and `highlight` at once (`input-copy.tsx:153-185,254-264`). `Icon` has a `fade` prop (`lib/icon.tsx:11`) and `colorFade` (`lib/theme.ts:310`) is used by select and combobox; this component uses neither.
- **Fidelity:** approximated (colour fade dropped).
- **Components it hits:** input-group (icon colour, its own entry).

## Icon stroke 1.5 to 2 on hover is instant, and applies to the wrong glyphs in the button variant

- **Cause:** `port choice` (instant: the stroke width is part of the SVG source string, README `group-hover` and "icon stroke 1.5 to 2" rows). The variant mismatch is `not ported yet`.
- **Original:** the stroke eases over 80 ms (`input-copy.tsx:159,187,217`). In the `button` variant only the copy icon changes with hover (`:317`); the check and cross are fixed at `strokeWidth={2}` (`:250,288`).
- **Port:** one `strokeWidth={hovered() ? 2 : 1.5}` for every glyph in both variants (`input-copy.tsx:186-193`), so the button variant's check and cross draw at 1.5 at rest.
- **Fidelity:** approximated.

## The value tint has a corner radius

- **Cause:** `port choice` (reason not stated).
- **Original:** `<mark>` with `bg-[#6B97FF]/20`, no radius (`input-copy.tsx:351`).
- **Port:** `highlight` with `radius: 2` (`input-copy.tsx:254-264`). How tall the tinted box is next to an inline `<mark>` was not compared.
- **Fidelity:** approximated.

## The monospace face is Menlo

- **Cause:** `port choice` (reason not stated).
- **Original:** Tailwind `font-mono` (`input-copy.tsx:344`): `ui-monospace, SFMono-Regular, Menlo, …`, resolved by the browser. The site sets no `--font-mono` of its own.
- **Port:** `MONO = "Menlo"` (`input-copy.tsx:22,267`).
- **Fidelity:** approximated (same face in Chrome on macOS, not in Safari, where `ui-monospace` is SF Mono).

## The tooltip's "Copied" reset runs on the row, not the whole field

- **Cause:** `not ported yet`.
- **Original:** `onMouseEnter` / `onMouseLeave` sit on the wrapper, so entering the label re-arms the tooltip and leaving it closes a "Copied" one (`input-copy.tsx:138-140,399`).
- **Port:** the handlers are on the row (`input-copy.tsx:290-291`), so the label does not count. The press snapshot (`tooltipOpenAtPress`) is read from the tooltip's `onOpenChange` like the source's ref, and a keyboard press reuses the last pointer snapshot as the source does.
- **Fidelity:** approximated (label hover only).

## The label is not part of the accessible name

- **Cause:** `not ported yet`.
- **Original:** `aria-labelledby={`${buttonId} ${labelId}`}` with `aria-label` "Copy" when a label is set, so the name reads "Copy <label>" (`input-copy.tsx:371-380`).
- **Port:** `aria-label` is "Copy to clipboard" whether or not a label is shown (`input-copy.tsx:286-292`); the label `<text>` is not referenced. gpuix accepts `aria-labelledby` (`FORK.md:455`).
- **Fidelity:** approximated.

## The copy goes through pbcopy / wl-copy

- **Cause:** `not ported yet`.
- **Original:** `navigator.clipboard.writeText`, then an off-screen textarea and `execCommand("copy")` as fallback (`input-copy.tsx:77-110`).
- **Port:** `copyToClipboard` spawns `pbcopy` on macOS and `wl-copy` on everything else (`input-copy.tsx:32-42`). gpuix has `navigator.clipboard.writeText` (`FORK.md:458`) and exports `clipboard` from `@gpuix/solid`, which `src/app.tsx:121` already uses. On Windows and X11 without `wl-copy` every copy ends in the red cross.
- **Fidelity:** approximated (works on macOS only).

## Ambient size and shape, passthrough props

- **Cause:** `not ported yet`.
- **Original:** `useSize(size)` falls back to the surrounding `SizeProvider`, `shape.input` follows `ShapeProvider` (8px or the pill's 20px), and `...props`, `className` and `ref` go to the wrapper div (`input-copy.tsx:58,384,396-401`).
- **Port:** `size` prop only, fixed `radius.item` 8 (`input-copy.tsx:80,298`), no `className`, `ref` or rest props. README lists the pill shape and the Size row as not ported. The port adds `copy` (injectable clipboard) and `testId`.
- **Fidelity:** dropped.
- **Components it hits:** every component with `size` (input-group, input-message).

## Static weights

- **Cause:** `gpuix gap`. Source `fontVariationSettings` 400 with `opsz` 14 on the value and the label (`input-copy.tsx:231,349,411`): see README "Missing features", variable-font row.

## Demo page

- **Cause:** `port choice` (the demo is a showcase card, not a docs page; reason not stated beyond that).
- **Original:** `app/docs/input-copy/page.tsx`: Basic, With Label, Button Variant, Left Aligned (icon and button, `gap-4`), Disabled, Copy Callback (`gap-2` to a caption with `px-1`), each in a `ComponentPreview` with its code, then a props table.
- **Port:** all six variants exist (`src/demos/input-copy.tsx:37-101`), stacked in one card at `gap: 8` (`:36`), the callback caption at `gap: 4` (`:87`). Extras: "Copy fails" (`:102`) and "Compact" (`:110`). The code snippets and props table are not ported.
- **Fidelity:** all source variants present; two extra.
