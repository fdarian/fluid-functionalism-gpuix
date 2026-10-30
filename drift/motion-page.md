# motion (page)

Original: `app/docs/motion/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), inside
`DocPage` / `DocSection` (`lib/docs/DocPage.tsx`) and `ComponentPreview` (`lib/docs/ComponentPreview.tsx`).
Ported in `src/pages/motion.tsx`, with the three demos in `src/pages/motion/` (`spring-tokens.tsx`, `modal-exit.tsx`,
`spring-reference.tsx`, `install-prompt.ts`) and the page chrome in the shared `src/lib/doc-page.tsx`, routed by the page registry (`src/lib/demo.ts` `loadPages`).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of repeating it.

## An exit is the demo's own transition swap, not `AnimatePresence`'s `exit` transition

- **Cause:** `gpuix gap`: `exit` takes a style target only, with no transition of its own (`packages/native/js/host.ts:410`, `MotionProps`).
- **Original:** `exit={{ opacity: 0, scale: 0.95, transition: exitTransition }}` inside `<AnimatePresence>` (`app/docs/motion/page.tsx:313-331`).
- **Port:** the frame keeps the layers mounted with `createPresence` (`src/lib/presence.ts`): `animate` flips to the closed target and `transition` swaps to the exit tween in the same render, and `onMotionComplete` (or the exit time plus 100ms) unmounts them. This is the pattern the port's popups use (`src/components/tooltip.tsx:175`).
- **Workaround:** as above.
- **Fidelity:** exact timing; the mechanism differs.

## `ComponentPreview` has no Inspect switch and no highlighted Code tab

- **Cause:** `not ported yet` (the Inspect overlay: pixel rulers and box-model inspector); `port choice` for the Code tab (no highlighter).
- **Original:** the frame's tab bar has a Preview / Code `TabsSubtle`, an Inspect `Switch` and the replay button, and the Code tab is Shiki HTML (`lib/docs/ComponentPreview.tsx:118-205`).
- **Port:** `ComponentPreview` in `src/lib/doc-page.tsx` has the Preview / Code tabs and the replay button with its tooltip. The Code tab is 13px Menlo in the foreground color, one `<text>` per line, scrolling sideways when a line is wider than the frame. The snippets are the source's, verbatim: they show `motion/react` and `spring.<tier>.exit`, where the port's tokens are `motion.<tier>` and `motion.<tier>Exit` (`src/lib/theme.ts`).
- **Fidelity:** dropped (Inspect), approximated (Code).
- **Components it hits:** every docs page that uses `ComponentPreview`; each page agent re-creates or hoists this file.

## Clicking an empty part of the preview does not move keyboard focus into the demo

- **Cause:** `not ported yet`.
- **Original:** `routeKeyboardOnMouseDown` focuses the demo's first interactive element, and `focus-within` shows the contrasted frame border (`lib/docs/ComponentPreview.tsx:90-94`).
- **Port:** the frame's `focusWithin` border (`foreground` at 40%, 150ms) is ported, but only a focus the demo already has (a pressed track, a Tab stop) lights it. An empty-space click focuses nothing.
- **Fidelity:** approximated.

## The Copy prompt has no live region, and the brief is fixed

- **Cause:** `port choice` (the live region, the brief).
- **Original:** `CopyPromptButton` crossfades the copy glyph into a check for 2s: opacity, `blur(4px)` and `scale: 0.6`, the arriving glyph on a 0.08 s `easeOut` tween and the leaving one on the exit token's 0.06 s `easeIn`, both in one grid cell the size of the icon, with a visually hidden "Copied" read out by `aria-live`. The brief comes from `buildInstallPrompt` (`lib/docs/copy-prompt-button.tsx:30-141`, `lib/docs/install-prompt.ts:38-95`).
- **Port:** the same cell, the same two tweens and the same `scale 0.6`, opacity and `blur(4px)`, on `motion.div`s (`CopyPromptGlyph`, `src/lib/doc-page.tsx:214-264`), drawn by `Button`'s `leadingIcon` as a function, as the source passes a component (`src/components/button.tsx:159-170`, `:220-247`). There is no live region and no hidden "Copied". The brief is `buildInstallPrompt({ slug: "motion", installSlug: "springs", base: "radix" })` written out in `src/pages/motion/install-prompt.ts`, not built from the page registry. It copies through `navigator.clipboard.writeText`; a failed copy logs and leaves the icon alone, as the source's does when its `execCommand` fallback fails too (minus the log).
- **Workaround:** none.
- **Fidelity:** approximated (no live region).
- **Components it hits:** the Installation block of every docs page.

## The previous / next arrows and the Installation block's responsive layout are not ported

- **Cause:** `not ported yet` (arrows, see `drift/introduction.md` "The previous / next arrows are missing"); `port choice` (the fixed 600px page column replaces every `sm:` breakpoint).
- **Original:** the header row carries the two arrow buttons (`lib/docs/DocPage.tsx:78-110`); the demos stack their columns and hide the usage caption below the `sm` breakpoint (`app/docs/motion/page.tsx:252,364`).
- **Port:** no arrows. The modal demo always has two columns and the tier rows always show their usage caption.
- **Fidelity:** dropped (arrows), exact at the source's desktop width.

## The reference chips navigate by slug, and `fluid-hover` may not exist yet

- **Cause:** `port choice`.
- **Original:** `<Link href="/docs/<slug>">` for a component with a page, plain text for the others (`app/docs/motion/page.tsx:182-198`).
- **Port:** a `role="link"` div calling `usePageNav().navigate(slug)` (`src/pages/motion/spring-reference.tsx`); Space activates it too, which a link does not do in a browser (it comes from `buttonProps`). "Mobile drawer" is plain text as in the source, though the port has a `mobile-drawer` demo. The "Fluid hover" chip links to a `fluid-hover` page that lands in a parallel branch: until it merges, it navigates to an empty column. The hover color eases over 150ms like `transition-colors`.
- **Fidelity:** exact for links to existing pages.

## Section spacing

- **Cause:** `port choice`.
- **Original:** `DocSection` is `gap-4 pt-6` with a `-mb-2` title; the `h3` is `mt-8`.
- **Port:** the same numbers as margins and padding (`src/lib/doc-page.tsx:163-204`); the page's description is tucked under `App`'s heading with `marginTop: -16`, as in `drift/introduction.md`. Titles are `weight.semibold`, the source's 550, the `h3` is `SubHeading` on `siteType.subtitle` (14/20).
- **Fidelity:** exact.

## The ⌘K row

- **Cause:** none (the source's System rows have no icon).
- **Original:** System rows are `kind: "page"` with `keywords: [s.slug, ...s.description.split(/\W+/)]` and no `icon` (`app/components/site-command-menu.tsx:206-218`).
- **Port:** `menuKeywords = ["motion", ...description.split(/\W+/)]` of the `systemList` description (`src/pages/motion.tsx:15-18`), no `menuIcon`.
- **Fidelity:** exact.
