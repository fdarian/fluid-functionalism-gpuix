# compare (page)

Original: `app/compare/page.tsx`, `app/compare/shadcn-theme.css`, `app/components/shadcn-previews.tsx`, `compare-fluid-previews.tsx`, `bento-previews.tsx`,
`bento-card.tsx` and the copied shadcn components under `components/shadcn/` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`).
Ported in `src/pages/compare.tsx` (page, slides, keys), with the card in `src/pages/compare/card.tsx`, the arrow-key region in `arrow-keys.tsx`,
the shared copy in `data.ts` (`app/components/demo-data.ts`), the Fluid side in `fluid-previews.tsx` and the shadcn side in `shadcn-previews.tsx` over the
rebuilt primitives in `src/pages/compare/shadcn/`; routed by the page registry (`src/lib/demo.ts` `loadPages`): group "Pages", order 3, layout "full", listed in the site menu only.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## The shadcn side is rebuilt from gpuix primitives, not Radix

- **Cause:** `port choice`: there is no DOM, so the copied `components/shadcn/*.tsx` (Radix + Tailwind) cannot run; each preview is built from `div` / `text` / `input` / `svg` and styled with the "neutral" tokens of `app/compare/shadcn-theme.css` (`src/pages/compare/shadcn/theme.ts`).
- **Original:** the shadcn `Accordion`, `Checkbox`, `DropdownMenu` markup, `Input`, `Label`, `RadioGroup`, `Slider`, `Switch`, `Table` and `Tabs` over Radix primitives (`app/components/shadcn-previews.tsx`, `components/shadcn/`).
- **Port:** one file per component in `src/pages/compare/shadcn/` (`accordion.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`, `input.tsx`, `radio-group.tsx`, `slider.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`) with the same sizes, radii, borders, type scale and states read off the class lists. Behaviour covered: click, Space / Enter (Radix leaves Enter alone on a checkbox and a radio, so it does here), roving tab stops and arrow keys on the radio group, tabs and accordion triggers, press and drag on the slider with Arrow / Page / Home / End, typing in the inputs. Not covered: disabled states, type-ahead, RTL, form hidden inputs, `aria-valuetext`, the `data-state` attributes.
- **Workaround:** none needed beyond the entries below.
- **Fidelity:** approximated (the look is matched by hand, not generated from the same classes).
- **Components it hits:** the ten slides' left cards.

## The tokens follow the port's scheme, in both columns

- **Cause:** `port choice`.
- **Original:** `.shadcn-theme` has the light tokens, the `prefers-color-scheme: dark` column (unless `:root.light`) and `.dark .shadcn-theme` (`app/compare/shadcn-theme.css:8-108`); a blanket `border-color: var(--border)` rule redirects Tailwind's `currentColor` borders.
- **Port:** `sc` in `src/pages/compare/shadcn/theme.ts` resolves the same values through `scheme()`, so System, Light and Dark all work and a theme change reaches the cards with the page-wide fade. Every border names its token, so no redirect rule is needed. The shadcn cards do not follow the Radius or Size rows, as in the source (Tailwind's `rounded-md` / `text-sm` are fixed).
- **Fidelity:** exact.

## The focus ring leaves its offset gap transparent

- **Cause:** `gpuix gap`: one `outline` per element, no second ring.
- **Original:** `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`: a 2px background-coloured gap, then the 2px ring.
- **Port:** a 2px outline at a 2px offset (`scRing`, `src/pages/compare/shadcn/theme.ts:73-79`); the gap shows what is behind, the page, where the source paints `--background`. The slider thumb's `ring-1` is a 1px outline at offset 0. The input shows it while it has focus.
- **Fidelity:** approximated.

## The inputs are gpuix `<input>`s with the field drawn around them

- **Cause:** `port choice`.
- **Original:** `Input` is one `<input>` with `border border-input bg-background px-3` and `focus-visible:ring-2` (`components/shadcn/input.tsx`).
- **Port:** a bordered row holding an `<input>`; the ring is the row's `focusWithin` outline. Text 14px (the `md:text-sm` size). A click anywhere in the row, or on the label (`htmlFor`), focuses the input. No selection styling, autofill or `file:` parts.
- **Fidelity:** approximated.
- **Components it hits:** every `<input>` the port draws.

## Typing and the two cards do not share a key scope the way the DOM does

- **Cause:** `not ported yet`: a key event's `target` is the element a `ref` gives (a `HostElement` with `type`, `props` and `parent`; gpuix `FORK.md:393-396`), so the source's `closest()` is a walk up `parent` reading `type` and `props.get("role")` (checked on the test renderer: the target of a keydown on a `role="tab"` div has `type` `div`, `props.get("role")` `tab` and a `parent`). The port still marks the regions by hand.
- **Original:** the window `keydown` handler skips a target in an `INPUT`, `TEXTAREA`, `SELECT`, a content-editable, or inside `[role=slider]`, `[role=tablist]`, `[role=radiogroup]`, `[role=listbox]`, `[role=menu]`, `[role=menubar]` (`app/compare/page.tsx:101-130`).
- **Port:** `ArrowKeys` (`src/pages/compare/arrow-keys.tsx`) wraps both previews of the slides whose widget is one of those: dropdown (menu), tabs, radio-group, slider, input-group, tabs-subtle (`KEEPS_ARROWS`, `src/pages/compare.tsx:46-53`). It counts `focusin` / `focusout` inside it, and the page's window handler does nothing while the count is above zero. The other four slides (checkbox-group, accordion, switch, table) step the slide with focus on their controls, as the source does. Left / Up go back and Right / Down go forward, with Meta, Ctrl, Alt and Shift left alone. `defaultPrevented` is not checked, as in the source, so Up / Down on an accordion trigger move focus and step the slide.
- **Workaround:** the wrapper regions; the page's window handler could skip a `target` by that walk instead.
- **Fidelity:** approximated (same outcome for these ten slides; a widget added later needs wrapping by hand).

## The slide is not in the URL

- **Cause:** `port choice`: the port has page slugs, no query string or history.
- **Original:** `/compare?c=<slug>` selects the slide on load and each step does `router.replace(...)` (`app/compare/page.tsx:73-90`).
- **Port:** the page opens on Dropdown every time; the slide is component state.
- **Fidelity:** dropped.

## "See demo" is disabled, "Learn more" opens the Introduction

- **Cause:** `not ported yet` (`/demo`); `port choice` (`/docs`).
- **Original:** "Learn more" links to `/docs`, "See demo" to `/demo` (`app/compare/page.tsx:155-161`).
- **Port:** "Learn more" calls `navigate("introduction")`, the page `/docs` serves. "See demo" is the tertiary button, disabled (`src/pages/compare.tsx:323-338`). The footer link under the Fluid card opens the component's demo page (`/docs/<slug>` in the source).
- **Fidelity:** approximated.

## The arrow tooltips are the port's chip

- **Cause:** `port choice` (the chip).
- **Original:** the previous arrow is `ArrowRight` with `rotate-180`; the tooltips hold `{name} &ensp;<kbd class="font-mono opacity-50">←</kbd>`, or "No previous" / "No next" when disabled (`app/compare/page.tsx:166-186`).
- **Port:** the previous arrow is `arrow-right` with `iconRotate="180deg"`, as the source. The tooltip is the port's `Tooltip` chip with the name, an en space and the key in Menlo at 50% (`src/pages/compare.tsx:121-162`); a disabled button's tooltip still opens, since the wrapper takes the hover.
- **Fidelity:** approximated (chip).

## The page has no breakpoints

- **Cause:** `port choice`.
- **Original:** `text-site-display` in bold (`wght 700, opsz 25`) with `leading-none`; `px-6 md:px-12`, `pt-16 sm:pt-24`, `grid-cols-1 md:grid-cols-2` (`app/compare/page.tsx:134-143, 192`).
- **Port:** `weight.bold`, line height = font size, stepping down with the Size row (`siteType.display`); padding 48 and top 96, two columns always (the window is not made narrower than the md and sm breakpoints in practice).
- **Fidelity:** approximated.

## The progress pills tween their width, no focus style of their own

- **Cause:** `port choice`.
- **Original:** `<button class="h-1.5 rounded-full transition-all duration-150">`, 24px wide current and 6px others, `foreground` at 40% (`app/compare/page.tsx:217-234`).
- **Port:** a pressable `div` (Enter, Space, a click) holding a `motion.div` that animates `width` over 0.15s (`src/pages/compare.tsx:167-195`). The 6px-tall hit area is the source's.
- **Fidelity:** approximated.

## Fluid side: the port's component widths and Slider engine

- **Cause:** `port choice` (each is a known width in the component's own drift file).
- **Original:** every Fluid preview fills a `w-full max-w-[N]` column (`app/components/bento-previews.tsx`, `compare-fluid-previews.tsx:57-70`).
- **Port:** the port's accordion (288), input group (288 against the 320 column), dropdown panel and choice groups have fixed widths, so the preview is centred in its column instead of filling it. The Opacity slider is `showValue={false}`, which the port's Slider takes as the compact thumb-and-track engine, so it draws that whatever the Size row says; Volume is the scrubber. The TabsSubtle list pins itself to the start of its parent (`alignSelf: flex-start`), so the preview wraps it in a centring row (the source's `w-fit mx-auto`).
- **Fidelity:** approximated.
- **Components it hits:** Accordion, InputGroup, Dropdown, Slider, TabsSubtle.

## Slides that render nothing in the source are left out

- **Cause:** `port choice` (same set the source shows).
- **Original:** `SLIDE_ORDER` lists 14 slugs; color-picker, thinking-indicator, thinking-steps and input-copy have no shadcn original, so they are filtered out at runtime (`app/compare/page.tsx:19-71`).
- **Port:** the ten that render: dropdown, checkbox-group, accordion, tabs, radio-group, slider, input-group, switch, table, tabs-subtle (`src/pages/compare.tsx:31-41`).
- **Fidelity:** exact.
