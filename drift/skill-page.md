# skill (page)

Original: `app/docs/skill/` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`): `page.tsx`, `hero.tsx`
(`SkillExamples`), `timeline.tsx`, `examples.tsx`, `menu-example.tsx` and `hero-shared.tsx` (the scripted cursor), inside `DocPage` / `DocSection`
(`lib/docs/DocPage.tsx`) and `ComponentPreview` (`lib/docs/ComponentPreview.tsx`).
Ported in `src/pages/skill.tsx`, with the timeline, the four examples and the playback machinery in `src/pages/skill/` (`timeline.tsx`,
`tabs-example.tsx`, `menu-example.tsx`, `copy-example.tsx`, `press-example.tsx`, `playback.tsx`, `scripted-pointer.ts`), routed by the page
registry (`src/lib/demo.ts` `loadPages`). The page chrome (`DocPage`, `ComponentPreview`) is `src/lib/doc-page.tsx`; see `drift/motion-page.md` for
its drift, which this page shares (inline code chips, the Copy prompt icon swap, no Inspect switch, no prev / next arrows, section spacing).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## The scripted cursor calls handlers and `click()`, not DOM events

- **Cause:** `gpuix gap`: hover is the one window pointer, and a script cannot move it or dispatch a synthetic mouse event to an element.
- **Original:** `useScriptCursor` dispatches `mouseover` / `mouseout` / `mousemove` `MouseEvent`s at the element under its tip, and marks it `data-script-hover` for the `:hover` rules (`app/docs/skill/hero-shared.tsx:92-170`).
- **Port:** `createScriptedPointer` (`src/pages/skill/scripted-pointer.ts`) asks the renderer which elements are under the tip (`getElementsAt`), then calls the `onMouseEnter` / `onMouseLeave` / `onMouseMove` props those elements were given (read off `HostElement.props`) with a window-space payload, and `click()`s the topmost one, which gpuix bubbles as a DOM click. Fluid hover, `TabsSubtle` and `InputCopy` therefore answer it as they answer a mouse. Native state styles (`hover:` / `active:` on a `style`) cannot follow it, so the generic and skill buttons of the press example are built from signals (`src/pages/skill/press-example.tsx`) instead of the port's `Button`, and the generic rows and tabs keep their hover in a signal. The cursor's tip is a pair of native motion values, and `goto` glides both with a 500 ms `easeInOut` `animate()` as the source's `animate(x, tx, glide)` (`hero-shared.tsx:222-223`), so nothing runs on the JS frame clock between glides or during one: a change listener on each value hovers what is under the tip, skipping the second report of a frame, and the final frame lands the hover. A pause (a visitor, out of view) `stop()`s the glides where they are (`src/pages/skill/playback.tsx:177-179`, `:195-206`, `:213-231`).
- **gpuix lacks:** a way to dispatch a synthetic pointer event (or set `:hover`) on one element: `simulateMouseMove` / `simulateClick` exist on the native renderer (`packages/native/index.d.ts:397`) but would move the window's one pointer under the visitor, and `NativeRenderer` (`packages/native/js/host.ts:2068`) does not type them.
- **Workaround:** the handler calls above; they reach into `HostElement.props` and `children`, which are public fields but not a documented API.
- **Fidelity:** approximated (the same hover and click reach the components; no `mouseover` / `mouseout` pair, no pointer events).
- **Components it hits:** any scripted demo; `TabsSubtle`, `InputCopy` and the fluid-hover lists work under it, `Button` (native state styles) does not.

## The timeline has no touch layout

- **Cause:** `port choice`: the port has no touch input.
- **Original:** with `(hover: none)` every dot rests visible and every title stays at full strength (`app/docs/skill/timeline.tsx:204-222`).
- **Port:** only the pointer layout: one gliding dot, titles muted until hovered.
- **Fidelity:** exact for a pointer, dropped for touch.

## The line highlights are gradients of fixed color, not `from-muted-foreground/70`

- **Cause:** `port choice`.
- **Original:** `bg-gradient-to-t from-muted-foreground/70 to-transparent` (`timeline.tsx:171,179`), blended in the browser's gradient space.
- **Port:** `linear-gradient` from `mutedForeground` at 70% to the same color at 0% (`src/pages/skill/timeline.tsx`), so the fade never passes through gray.
- **Fidelity:** approximated.

## The copy example's skill side shows a tooltip

- **Cause:** `port choice`.
- **Original:** the skill side's `InputCopy` is the real component with its hover mirrored for `[data-script-hover]`, and `clickWithoutClipboard` swaps `navigator.clipboard.writeText` for one write (`examples.tsx:128-175`).
- **Port:** the real `InputCopy` (`variant="icon"`, so its tooltip shows under the cursor and says "Copied" if it was open at the press, as for a mouse). The scripted click goes through the same `clickWithoutClipboard` stand-in for `navigator.clipboard.writeText` (`src/pages/skill/copy-example.tsx`), and a visitor's own click writes the clipboard.
- **Fidelity:** exact behavior; the system clipboard is never touched by the script.

## Playback gating reads the focus-visible match and the OS reduced-motion setting

- **Cause:** `port choice` (the DOM's `useInView`, `useReducedMotion`, `:focus-visible` and mouse events become gpuix's equivalents).
- **Original:** `useInView(amount: 0.35)`, motion's `useReducedMotion()`, `onFocus` checking `matches(":focus-visible")`, and mouse listeners that ignore the scripted events (`hero-shared.tsx:25-52`).
- **Port:** an `IntersectionObserver` with a 0.35 ratio, `createReducedMotion()` (the OS setting, read on macOS only; README "MotionConfig and reduced motion"), `onFocusIn` asking the renderer whether the focused element matches `:focus-visible`, and mouse handlers that skip any event the scripted pointer made (`src/pages/skill/playback.tsx`, `scripted-pointer.ts`). While the OS asks for reduced motion no example plays.
- **Fidelity:** exact.

## The heading is a page export, and the menu row has no "New" tag

- **Cause:** `port choice` (heading); `not ported yet` (the menu's tag).
- **Original:** the heading is `/fluid-functionalism skill`, the sidebar and menu say "Skill" with a New dot and tag, which follow the latest release (`app/components/sidebar.tsx:82`, `app/components/site-command-menu.tsx:194-217`).
- **Port:** `heading` is a new optional page export read by `App`'s `PageBody` (`src/lib/demo.ts`, `src/app.tsx`); the sidebar row is "Skill" with the release-driven dot (`src/app.tsx:226-244`), and the menu row has no tag, as for every other page.
- **Fidelity:** exact heading and dot, dropped menu tag.

## The ⌘K row

- **Cause:** none (the source's System rows have no icon).
- **Original:** `kind: "page"` with `keywords: [s.slug, ...s.description.split(/\W+/)]`, no `icon` (`app/components/site-command-menu.tsx:206-218`, `lib/docs/components.ts:65-71`).
- **Port:** `menuKeywords = ["skill", ...description.split(/\W+/)]`, no `menuIcon` (`src/pages/skill.tsx`).
- **Fidelity:** exact.

## The Copy prompt copies the install prompt and reports nothing

- **Cause:** `port choice`.
- **Original:** the button calls `track("Skill install copied", { method: "prompt" })` (`app/docs/skill/page.tsx:30`).
- **Port:** the shared `DocPage` button only copies (through `navigator.clipboard.writeText`); there is no analytics.
- **Fidelity:** exact prompt text, dropped tracking.
