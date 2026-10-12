# gpuix + fluid functionalism

Can [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine, draw the
[fluidfunctionalism.com](https://fluidfunctionalism.com) components? This ports three of them at the default size and
rounded shape, laid out like the site's showcase page: **Button** (four variants, compact, icons, disabled,
loading), **Combobox** (single-select, filtering, keyboard, empty state) and **Sidebar** (with the shared fluid
hover, a gliding active background and a collapsible sub-menu). Both colour schemes are ported, dark by default,
and the top-right "Make them yours" card has a Theme select (Light / Dark) that re-colours everything live.

Answer: yes, all three render and behave like the originals. The gaps are in the details, and they are listed in
the [translation table](#translation-table) below.

| | |
|---|---|
| ![showcase](screenshots/showcase/initial.png) | ![button hover](screenshots/button/hover.png) |
| ![combobox open](screenshots/combobox/open.png) | ![sidebar sub-menu](screenshots/sidebar/sub-menu.png) |

Every page has an `initial.png` and a `light.png` (the same page after flipping the theme) in
`screenshots/<demo>/`, plus the states its demo captures. `screenshots/live/` holds two captures of the real
window.

## Run it

```bash
bun install
bun --hot src/main.tsx
```

`@gpuix/native` and `@gpuix/solid` are bun workspaces pointing at the fork at `~/code/fdarian/gpuix`, wired like
[`../gpuix-pierre-diffs`](../gpuix-pierre-diffs) (see its README for building the native addon). The fork must be
at `poc` a02ec23 or later: the highlight and popups use its native `motion` springs, so rebuild the addon and the
`@gpuix/solid` dist after pulling it. The Solid JSX
transform is a Bun preload (`bunfig.toml`), so there is no build step. `solid-js` is pinned to the version
gpuix resolves: two copies of Solid give two reactive systems and nothing updates.

```bash
bun run typecheck                      # tsc
bun scripts/screenshots.tsx <demo>     # headless captures of one page, into screenshots/<demo>/
bun scripts/live-check.tsx             # the same flow against the real window, via gpuix's automation client
```

## Layout

```
src/lib/          shared primitives: theme, icons, icon, fluid-hover, fluid-highlight, popup, demo-kit, demo
src/components/   one file per component: button, combobox, select, sidebar
src/demos/        one page per component, discovered at startup
src/app.tsx       sidebar + page host + the "Make them yours" card
limitations/      one file per component: each gpuix gap, the workaround and its fidelity
```

A new component adds `src/components/<name>.tsx`, `src/demos/<name>.tsx` and `limitations/<name>.md`, and edits no
shared file: `src/lib/demo.ts` finds every `src/demos/*.tsx` with `Bun.Glob` and a dynamic `import` when the app
starts (restart `--hot` to pick up a new file), and the sidebar lists them by title. A demo file exports:

```ts
export const title = "Button";
export const group = "Components";
export function Demo(): JSX.Element {}              // one or more <DemoCard>s from src/lib/demo-kit
export const scenarios: DemoModule["scenarios"] = async (shot) => {};  // optional
```

`scenarios` drives `bun scripts/screenshots.tsx <demo>` with `shot.hover / click / down / up / press / moveTo /
clickAt / settle / expectText / capture`; see `ShotContext` in `src/lib/demo.ts`. Give elements a `testId` to
target them.

## How it is put together

- `src/lib/theme.ts` holds the resolved design tokens: both columns of every `light-dark()` in `app/globals.css`
  (with `color-mix()` mixed offline), the type scale, radii, heights and the springs. `color.x` reads a `scheme`
  signal, so any JSX prop that touches it re-colours on a theme change; tokens must be read inside JSX or a
  function, never at module scope.
- `src/components/` are the components; `src/lib/popup.tsx` is the popup chrome the combobox and select share.
- `src/lib/fluid-hover.ts` is `use-fluid-hover.ts`: rows register, their painted boxes are read with
  `renderer.getElementBounds`, and `pickNearest` (ported verbatim) resolves the pointer to a row, including gaps.
- `src/lib/fluid-highlight.tsx` is the one absolutely positioned highlight that glides between rows with the native
  `motion` spring. The sidebar's active backgrounds and the combobox's checked background reuse it with a slower
  spring.
- `src/lib/icons.ts` holds the shared lucide glyphs as SVG strings (a component can `defineIcon(...)` its own), drawn with `<svg source>` and tinted by `style.color`.

Fluid hover is the part that depends on gpuix internals. The first `getElementBounds` call only turns bounds
tracking on, and bounds exist from the next painted frame, so measuring waits two frames and retries for up to
twelve; a tree that still has no bounds throws. It re-measures when the pointer enters a list, when the combobox
filter changes, and every frame for the length of a sub-menu animation.

## Translation table

| Tailwind / CSS | gpuix | Fidelity |
|---|---|---|
| `hover:` / `active:` on the same element | `style.hover` / `style.active`, applied natively | Exact |
| `group-hover:` (icon stroke, label colour) | `onMouseEnter` / `onMouseLeave` plus a signal | Exact, one JS round trip |
| `focus-visible:ring-1` | `style.focusVisible` outline, offset 1 | Exact |
| `ring-1 ring-border` | `outlineWidth` / `outlineColor`: outside the box, takes no layout | Exact |
| `transition-colors duration-80`, `transition-[box-shadow]` | none: state styles switch instantly. Only `motion` animates | Dropped |
| spring `fast` / `moderate` (`motion/react`) | native `motion` spring, `{ type: "spring", duration: 0.08 / 0.16, bounce: 0 }`, velocity kept when the target changes mid-flight | Exact; `slow` is unused |
| exits (`spring.fast.exit` …) | plain tweens, 60 ms / 120 ms, like the source | Exact |
| "snap, don't spring" on a reflow | a zero-length tween | Exact |
| `translate` / `x`,`y` travel of the highlight | `motion` on `top` / `left` / `width` / `height` (the only layout props it animates) | Equivalent, but it re-lays out per frame |
| `scaleY: 0.96` on popup enter | not possible, no transforms. Opacity plus the 4px slide stay (`top` −4 → 0) | Partly dropped |
| `z-index` (overlays under rows) | document order: the highlights are the container's first children and rows keep transparent backgrounds | Equivalent |
| press-shrink: inset-px layer plus same-colour `box-shadow` spread | the element carries `margin: 1` and a spread-1 shadow, and `active` sets spread 0 | Exact for flat fills |
| translucent fill (`--tint`, `bg-hover`) over that shadow | gpuix paints a shadow under its element with no knock-out, so a background on top doubles up. Fills are the shadow alone, with no `backgroundColor` | Exact, but a different mechanism |
| tertiary ring that moves inward on press (outer to inset shadow) | outline, offset 0 at rest and −1 pressed | Exact |
| `shadow-surface-3` (1px ring + two stacked drops) | `borderWidth: 1` plus one drop shadow. gpuix paints a single non-inset shadow | Approximated |
| `color-mix(in oklab, …)`, `light-dark()` | both columns kept as a token table; the scheme is a signal | Exact |
| dark `--shadow-3` (inset hairline + ring + drops) | popup `borderColor` of white at 5% plus the one drop shadow | Approximated |
| `prefers-color-scheme` ("System" theme) | gpuix exposes no OS appearance, so the select offers Light and Dark only | Dropped |
| Base UI `Positioner` (flip, `--anchor-width`) | `<anchored gap={6} deferred>`; the popup width is a constant. gpuix snaps an overflowing popup into the window, and its `switch` flip anchors to the far edge of the field and covers it, so the combobox picks `top` or `bottom` itself from the painted bounds and the window height | Approximated |
| `ScrollArea` (hover thumb, scroll fade) | a plain `overflowY: "scroll"`, on the combobox list and the sidebar | Dropped |
| absolute child of a scroll container | gpuix paints it where it was placed, not where the content has scrolled to, so rows and overlays share a relative wrapper *inside* the scroller | Needed workaround |
| `getBoundingClientRect`, `ResizeObserver` | `getElementBounds` (last painted frame) read on timers | Approximated, up to a frame stale |
| `text-[length:…] leading-[…]` | `fontSize` + `lineHeight` | Exact |
| `[text-box:trim-both_cap_alphabetic]` | none: labels are centred by their line box | Dropped, a pixel of optical drift |
| Inter variable (`wght 550`, `opsz`) | gpuix cannot load fonts, so this is `Helvetica Neue`; 400 / 550 map to the nearest cut, no `opsz` | Dropped |
| ghost-span that reserves the semibold width | the same trick: a hidden copy in flow, the visible label absolutely positioned over it | Exact |
| `truncate` | `whiteSpace: "nowrap"` + `textOverflow: "ellipsis"` on the combobox rows | Exact; sidebar labels are not truncated |
| icon stroke 1.5 → 2 on hover | the SVG string is swapped | Exact, instant |
| `animation: spinner-move` | a static lucide `loader`: no rotation, no animation | Dropped |
| `AnimatePresence` exit of the popup | the popup stays mounted for 60 ms while its opacity fades | Approximated |

gpuix-only behaviour worth knowing: it dims every other focusable control while one has keyboard focus, so
`keyboardFocusDim: false` is set on buttons and inputs. Escape is handled on the combobox input, not through a
dismiss layer, and clicking outside closes it through `onMouseDownOutside` on the field and on the popup.

## Not ported

Pill shape, the Radius / Size / Icons / Primitive rows of the customise card, the card's GitHub badge, multiple-select combobox, chips, the clear-on-blur details of Base UI's primitive, rail
resize, the mobile sheet, the traveling keyboard focus ring in the sidebar, row actions, and `gapClick` (a click
between rows is not routed to the highlighted row). The combobox has no `aria-activedescendant` wiring.
