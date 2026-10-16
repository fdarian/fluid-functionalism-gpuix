# button

Original: `registry/base/button.tsx` (Base UI `Button`; the docs page imports the Radix twin, which looks the same), demo in `app/docs/button/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/button.tsx` (with `src/lib/press.ts`), demo in `src/demos/button.tsx`.

Checked with no drift: sizes (36 / 28 / icon squares), paddings (16 / 12, 12 / 8 with an icon), gaps (6 / 4), type (13/20, 12/18), icon sizes (16 / 14) and stroke (1.5, 2 on hover), colours in both schemes (the `color-mix()` hovers resolve to `#292929` / `#3d3d3d` light and `#dcdcdc` / `#c3c3c3` dark, checked), the focus ring (offset 1 from the inset surface lands on the source's 1px ring outside the button), disabled (0.5 opacity, no pointer, not tabbable), loading as disabled, Enter and Space activation, and the label hover colour of ghost.

## A held Space does not press the button

- **Cause:** `gpuix gap`.
- **Original:** a native `<button>` matches `:active` while Space is held, so the press-shrink (`group-active:`, `registry/base/button.tsx:115-127`) plays for a keyboard activation too.
- **Port:** the pressed look is `style.active` (`src/components/button.tsx:232`); Space still activates on key-up through `buttonProps` (`:194-197`).
- **gpuix lacks:** a keyboard `:active` state. `active` styles come from the pointer's press chain only (`~/code/fdarian/gpuix/FORK.md:305-306`). Rechecked on the test renderer: with a focused `buttonProps` element carrying `active: { backgroundColor }`, the capture while `nativeSimulateKeyDown(id, "space")` is held is byte-identical to the resting one.
- **Workaround:** none.
- **Fidelity:** approximated: the activation is exact, the pressed look is missing for the keyboard.
- **Components it hits:** every `buttonProps` button.

## `simulateKeystrokes("space")` delivers no key-up

- **Cause:** `gpuix gap` (test harness only).
- **Original:** n/a.
- **Port:** `press` in `scripts/screenshots.tsx:168-171` calls `simulateKeystrokes`; `ShotContext` has no helper for `nativeSimulateKeyDown` / `nativeSimulateKeyUp`.
- **gpuix lacks:** a key-up from `simulateKeystrokes`: it makes one native call (`packages/native/js/testing.ts:441-450`), so a focused `buttonProps` element sees a keydown for `" "` and neither `keyup` nor `click`, while `nativeSimulateKeyDown` then `nativeSimulateKeyUp` gives keydown, click, keyup. The helper also still takes GPUI key names (`space`, `cmd-shift-p`; `~/code/fdarian/gpuix/README.md:3186`).
- **Workaround:** scenarios press Enter, which activates on key-down. `nativeSimulateKeyDown` / `nativeSimulateKeyUp` would do it.
- **Fidelity:** exact in the real window; a harness gap only.
- **Components it hits:** any scenario that wants Space on a Base UI-style button.

## Translucent fills are the shadow alone

- **Cause:** `gpuix gap`.
- **Original:** surface layer inset 1px (`:211`) with `bg-[var(--btn-bg)]` plus a same-colour `shadow-[0_0_0_1px_...]` that collapses on press (`:113-128`). Secondary's `--tint` and ghost's `--hover` are translucent; an outer CSS shadow paints only outside the box, so fill and ring never double up (comment `:105-112`).
- **Port:** the element is the inset surface (`margin: 1`, height and padding give 1px back, `:137-142`, `:217-221`) and carries no `backgroundColor`; the fill is `boxShadow: fill(colour, 1)`, press sets spread 0 (`src/lib/press.ts:10-18`, `src/components/button.tsx:63-93`). Tertiary's ring is an outline, 0 offset at rest and -1 pressed (`:74-87`).
- **gpuix lacks:** the knock-out of an outer `box-shadow` under its own box. `shadow_fragment` covers the whole rounded rect, so a background on top of a translucent shadow doubles up (`~/code/fdarian/gpuix/zed/crates/gpui_apple/src/shaders.metal:628`; inset shadows are clipped to the element, `:648-654`).
- **Workaround:** the shadow is the fill; outline for the tertiary ring.
- **Fidelity:** exact in colour and geometry; a different mechanism.
- **Components it hits:** just this one (`CardButton` fills with plain `backgroundColor`, no ring).

## No transitions on hover, press and label colour

- **Cause:** `not ported yet`.
- **Original:** `transition-colors duration-80` on the root (`:21`); the surface eases `box-shadow` over 180ms on `cubic-bezier(0.23,1,0.32,1)` and `background-color` over 80ms, both 80ms while pressed (`:212`).
- **Port:** every state switches at once: `hover` / `active` style objects with no `transition*` (`src/components/button.tsx:210-233`); the ghost label colour follows the `hovered` signal (`:125-134`) and `<text>` carries no `colorFade` (`src/lib/theme.ts:310-314`, used only by `Icon fade`, which the button does not pass).
- **Workaround:** none. README's "gpuix gaps" no longer lists colour transitions; gpuix animates `color`, `backgroundColor`, `outlineColor` and `boxShadow` on state-style changes (`FORK.md:815-818`). The README's "How the first three components translate" row ("none: state styles switch instantly") is stale.
- **Fidelity:** dropped.
- **Components it hits:** every component with a hover or press fill; `Icon` has `fade` for colour (the button's icons use only `easeStroke`, as the source eases only the stroke width).

## Loading spinner is a static glyph

- **Cause:** `not ported yet`.
- **Original:** an infinity-shaped path in a 24 viewBox drawn at 36px (28px compact), `strokeDasharray` 15 85, `spinner-move 2s linear infinite` (dash offset to -100) and `spinner-dash 4s ease-in-out infinite` (dash 15 to 40), stroke 1.125 (`:199-201`, `:228-246`, `app/globals.css:998-1005`).
- **Port:** the lucide `loader` spokes at the icon size (16 / 14), stroke 1.5, no motion (`src/components/button.tsx:248-266`, `src/lib/icons.ts:20`).
- **Workaround:** none. README calls this "Dropped" but it needs no transform: gpuix animates SVG `strokeDasharray` / `strokeDashoffset` with repeating keyframes (`FORK.md:828-829`, `:822-823`), and `file-thumbnail.tsx` already draws a moving arc.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Label is not trimmed to cap height

- **Cause:** `gpuix gap`.
- **Original:** `[text-box:trim-both_cap_alphabetic]` on the label span (`:265`).
- **Port:** the label keeps its 20px (18 compact) line box inside the flex-centred button (`src/components/button.tsx:159-168`).
- **gpuix lacks:** `text-box-trim`; see the badge row in README "gpuix gaps" and `drift/badge.md`.
- **Workaround:** none.
- **Fidelity:** approximated (about a pixel of optical drift).
- **Components it hits:** every trimmed label (badge, card title in inline cards, `CardButton`).

## Keyboard auto-repeat of Enter

- **Cause:** `port choice` (the port uses gpuix `buttonProps`; `BASE-UI-AUDIT.md:185` decides to leave it).
- **Original:** a native `<button>` clicks again for each Enter key-repeat.
- **Port:** `buttonProps` ignores repeats (`packages/solid/src/components/button.ts:48`, `!event.repeat`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every `buttonProps` element.

## `active`, `asChild` / `render` and the legacy sizes

- **Cause:** `port choice` (out of scope per the lead's decision, `BASE-UI-AUDIT.md:176`).
- **Original:** `active` forces the pressed look while a menu the button opened is showing (`:99-102`, `:130-141`); `asChild` / `render` make another element the root (`:86-95`, `:163-186`, `:290-302`); `sm` / `md` / `lg` / `icon-sm` / `icon-lg` resolve onto the ladder (`:61-78`).
- **Port:** none of them (`src/components/button.tsx:95-116`). A dropdown trigger does not look engaged while its menu is open.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every popup trigger that is a `Button` (dropdown, select).

## No ambient size or shape, no `className`, `type` or `ref`

- **Cause:** `not ported yet`.
- **Original:** an omitted `size` follows the surrounding `SizeProvider` (`:187-194`); the radius comes from the shape context, 20px for the pill (`:202`, `:286`); `className` / `style` (the demo's `w-full`) and every `<button>` attribute pass through, including `type="submit"` (`:143-160`, `:304-316`).
- **Port:** `size` defaults to `default`, so compact must be passed to each button; the radius is `radius.item` (8, `src/components/button.tsx:223`); the prop list is fixed (`:95-116`), so no full-width button and no form submit from a button (the demos call `form.requestSubmit()`, README "combobox, select (any form)" row).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component with a size ladder or shape (README: "pill shape" and the customise card are not ported).

## Icon-only buttons take `icon`, not a child

- **Cause:** `port choice` (reason not stated).
- **Original:** `size="icon"` renders `children` (any element, usually an icon) inside the label wrapper (`:248-251`).
- **Port:** the glyph is the `icon` prop and `children` is ignored for icon sizes (`src/components/button.tsx:156-177`); `trailingContent` is a port-only slot for a keycap (`:113-114`).
- **Workaround:** n/a.
- **Fidelity:** exact in look.
- **Components it hits:** just this one.

## Demo: variants that exist and are missing

- **Cause:** `not ported yet`.
- **Original:** `app/docs/button/page.tsx:95-148`: a Playground (variant, size, label, icon-only, leading, trailing, loading, active, disabled; `lib/docs/playgrounds/button.tsx`), Variants (four inline plus four `w-full`), With Icons (`Create` leading `plus`, secondary `Next` trailing `arrow-right`, tertiary `Search` leading `search` and trailing `arrow-right`), Loading & Disabled (a `Click me` button that loads for 2s, secondary `Saving` loading with a leading `loader`, `Disabled`).
- **Port:** `src/demos/button.tsx:39-71`: Default and Compact rows of the four variants, a Leading icon row (`plus` on all four), Icon only (both sizes), Disabled and Loading rows of the four variants. Missing: the playground, full-width buttons, trailing and both-sided icons, the click-to-load button, `active`. Added: the Compact, Icon only and per-variant Disabled / Loading rows. The icon-only buttons have no `aria-label` (the source playground sets one, `playgrounds/button.tsx:55`, `:222`). Copy matches.
- **Workaround:** n/a.
- **Fidelity:** n/a.
- **Components it hits:** just this one.
