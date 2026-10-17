# button

Original: `registry/base/button.tsx` (Base UI `Button`; the docs page imports the Radix twin, which looks the same), demo in `app/docs/button/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/button.tsx` (with `src/lib/press.ts`), demo in `src/demos/button.tsx`.

Checked with no drift: sizes (36 / 28 / icon squares), paddings (16 / 12, 12 / 8 with an icon), gaps (6 / 4), type (13/20, 12/18), icon sizes (16 / 14) and stroke (1.5, 2 on hover), colours in both schemes (the `color-mix()` hovers resolve to `#292929` / `#3d3d3d` light and `#dcdcdc` / `#c3c3c3` dark, checked), the focus ring (offset 1 from the inset surface lands on the source's 1px ring outside the button), disabled (0.5 opacity, no pointer, not tabbable), loading as disabled, Enter and Space activation, and the label hover colour of ghost.

## A held Space does not press the button

- **Cause:** `gpuix gap`.
- **Original:** a native `<button>` matches `:active` while Space is held, so the press-shrink (`group-active:`, `registry/base/button.tsx:115-127`) plays for a keyboard activation too.
- **Port:** the pressed look is `style.active` (`src/components/button.tsx:234`); Space still activates on key-up through `buttonProps` (`:193-196`).
- **gpuix lacks:** a keyboard `:active` state. `active` styles come from the pointer's press chain only (`~/code/fdarian/gpuix/FORK.md:313-314`). Rechecked on the test renderer: with a focused `buttonProps` element carrying `active: { backgroundColor }`, the capture while `nativeSimulateKeyDown(id, "space")` is held is byte-identical to the resting one.
- **Workaround:** none.
- **Fidelity:** approximated: the activation is exact, the pressed look is missing for the keyboard.
- **Components it hits:** every `buttonProps` button.

## `simulateKeystrokes("space")` delivers no key-up

- **Cause:** `gpuix gap` (test harness only).
- **Original:** n/a.
- **Port:** `press` in `scripts/screenshots.tsx:182-185` calls `simulateKeystrokes`; `ShotContext` has no helper for `nativeSimulateKeyDown` / `nativeSimulateKeyUp`.
- **gpuix lacks:** a key-up from `simulateKeystrokes`: it makes one native call (`packages/native/js/testing.ts:441-450`), so a focused `buttonProps` element sees a keydown for `" "` and neither `keyup` nor `click`, while `nativeSimulateKeyDown` then `nativeSimulateKeyUp` gives keydown, click, keyup. The helper also still takes GPUI key names (`space`, `cmd-shift-p`; `~/code/fdarian/gpuix/README.md:3186`).
- **Workaround:** scenarios press Enter, which activates on key-down. `nativeSimulateKeyDown` / `nativeSimulateKeyUp` would do it.
- **Fidelity:** exact in the real window; a harness gap only.
- **Components it hits:** any scenario that wants Space on a Base UI-style button.

## Translucent fills are the shadow alone

- **Cause:** `gpuix gap`.
- **Original:** surface layer inset 1px (`:211`) with `bg-[var(--btn-bg)]` plus a same-colour `shadow-[0_0_0_1px_...]` that collapses on press (`:113-128`). Secondary's `--tint` and ghost's `--hover` are translucent; an outer CSS shadow paints only outside the box, so fill and ring never double up (comment `:105-112`).
- **Port:** the element is the inset surface (`margin: 1`, height and padding give 1px back, `:137-142`, `:217-221`) and the fill is `fill(colour, 1)`: the `backgroundColor` fills the box and a spread-1 `boxShadow` the ring around it; press sets spread 0 (`src/lib/press.ts:10-18`, `src/components/button.tsx:63-92`). Tertiary's ring is an outline, 0 offset at rest and -1 pressed (`:73-86`).
- **gpuix lacks:** nothing now: an outer `box-shadow` is painted only outside the border box (gpuix `box-shadow-outside-border-box` changeset), so a background and a translucent shadow do not double up.
- **Workaround:** none needed for the fill; outline for the tertiary ring. Hover and press ease like the source (`boxShadow` 180ms on `cubic-bezier(0.23,1,0.32,1)`, `backgroundColor` 80ms, both 80ms while pressed; label colour and icons over 80ms), but the tertiary ring's 1px move inward on press (`outlineOffset` 0 to -1) switches at once: a transition on `outline-offset` would also ease the focus ring's offset when the button gains keyboard focus, which the source does not.
- **Fidelity:** exact in colour and geometry; a different mechanism. The tertiary ring's press move is instant.
- **Components it hits:** just this one (`CardButton` fills with plain `backgroundColor`, no ring).

## Loading spinner is a static glyph

- **Cause:** `not ported yet`.
- **Original:** an infinity-shaped path in a 24 viewBox drawn at 36px (28px compact), `strokeDasharray` 15 85, `spinner-move 2s linear infinite` (dash offset to -100) and `spinner-dash 4s ease-in-out infinite` (dash 15 to 40), stroke 1.125 (`:199-201`, `:228-246`, `app/globals.css:998-1005`).
- **Port:** the `loader` glyph of the Icons row's library (lucide spokes by default) at the icon size (16 / 14), stroke 1.5, no motion (`src/components/button.tsx:250-268`, `src/lib/icons/lucide.ts:21`).
- **Workaround:** none. README calls this "Dropped" but it needs no transform: gpuix animates SVG `strokeDasharray` / `strokeDashoffset` with repeating keyframes (`FORK.md:1147-1148`, `:846-847`), and `file-thumbnail.tsx` already draws a moving arc.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Label is not trimmed to cap height

- **Cause:** `gpuix gap`.
- **Original:** `[text-box:trim-both_cap_alphabetic]` on the label span (`:265`).
- **Port:** the label keeps its 20px (18 compact) line box inside the flex-centred button (`src/components/button.tsx:158-167`).
- **gpuix lacks:** `text-box-trim`; see the badge row in README "gpuix gaps" and `drift/badge.md`.
- **Workaround:** none.
- **Fidelity:** approximated (about a pixel of optical drift).
- **Components it hits:** every trimmed label (badge, card title in inline cards, `CardButton`).

## Keyboard auto-repeat of Enter

- **Cause:** `port choice` (the port uses gpuix `buttonProps`; `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:188` decides to leave it).
- **Original:** a native `<button>` clicks again for each Enter key-repeat.
- **Port:** `buttonProps` ignores repeats (`packages/solid/src/components/button.ts:48`, `!event.repeat`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every `buttonProps` element.

## `active`, `asChild` / `render` and the legacy sizes

- **Cause:** `port choice` (out of scope per the lead's decision, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:178`).
- **Original:** `active` forces the pressed look while a menu the button opened is showing (`:99-102`, `:130-141`); `asChild` / `render` make another element the root (`:86-95`, `:163-186`, `:290-302`); `sm` / `md` / `lg` / `icon-sm` / `icon-lg` resolve onto the ladder (`:61-78`).
- **Port:** none of them (`src/components/button.tsx:94-115`). A dropdown trigger does not look engaged while its menu is open.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every popup trigger that is a `Button` (dropdown, select).

## No `className`, `type` or `ref`

- **Cause:** `not ported yet`.
- **Original:** `className` / `style` (the demo's `w-full`) and every `<button>` attribute pass through, including `type="submit"` (`registry/base/button.tsx:143-160`, `:304-316`).
- **Port:** the prop list is fixed (`:95-116`), so no full-width button and no form submit from a button (the demos call `form.requestSubmit()`, README "combobox, select (any form)" row). An omitted `size` follows the Size row (`:119`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every ported component.

## Icon-only buttons take `icon`, not a child

- **Cause:** `port choice` (reason not stated).
- **Original:** `size="icon"` renders `children` (any element, usually an icon) inside the label wrapper (`:248-251`).
- **Port:** the glyph is the `icon` prop and `children` is ignored for icon sizes (`src/components/button.tsx:156-176`); `trailingContent` is a port-only slot for a keycap (`:112-113`).
- **Workaround:** n/a.
- **Fidelity:** exact in look.
- **Components it hits:** just this one.

## Demo: variants that exist and are missing

- **Cause:** `port choice` (no prop to drive it).
- **Original:** `app/docs/button/page.tsx:95-148`: Variants (four inline plus four `w-full`), With Icons (`Create` leading `plus`, secondary `Next` trailing `arrow-right`, tertiary `Search` leading `search` and trailing `arrow-right`), Loading & Disabled (a `Click me` button that loads for 2s, secondary `Saving` loading with a leading `loader`, `Disabled`).
- **Port:** `src/demos/button.tsx`: Default and Compact rows of the four variants, a Leading icon row (`plus` on all four), a Trailing icon row (secondary `Next`, tertiary `Search` on both sides), Icon only (both sizes), Disabled and Loading rows of the four variants, and a Click to load row (the 2s button and the loading secondary `Saving` with a leading `loader`). Missing: the four `w-full` buttons (`Button` has no width prop). Added: the Compact, Icon only and per-variant Disabled / Loading rows. The icon-only buttons have no `aria-label` (the source playground sets one, `playgrounds/button.tsx:55`, `:222`). Copy matches.
- **Workaround:** n/a.
- **Fidelity:** n/a.
- **Components it hits:** just this one.

## Playground: no Active switch, Label field not right-aligned, Size does not follow the site size

- **Cause:** `port choice` (no `active` prop) for Active; `gpuix gap` for the field alignment; `not ported yet` for Size.
- **Original:** `lib/docs/playgrounds/button.tsx`: an `Active` switch forces the pressed look (`active` prop, `registry/base/button.tsx:115-127`); the Label input is `text-right` (`:75`); the Size select follows the site-wide size step until a value is picked (`useSizeVariant`, `:98-100`); the Code tab shows the matching snippet.
- **Port:** `src/demos/button.tsx` `Playground`: every other control and the shuffle are ported with the source's defaults and odds. `Button` has no `active` prop, so the Active switch is left out (the shuffle drops its roll too). The Label field (`PlayText`) is left-aligned: the `<input>` takes `textAlign: "right"` without effect in the capture. Size starts at Default and is only set by its own select. No Code tab (see `site.md`).
- **gpuix lacks:** right-aligned text in `<input>` (unverified at the source; the style is accepted and does nothing in the test renderer).
- **Workaround:** none.
- **Fidelity:** approximated (left-aligned label text), dropped (Active).
- **Components it hits:** any playground with a text field.
