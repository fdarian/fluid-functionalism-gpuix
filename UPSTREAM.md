# Upstream

This is a port of **[Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism)**
(fluidfunctionalism.com, MIT, Copyright (c) 2026 Micka Touillaud) to Solid on [ghia](https://github.com/fdarian/ghia) (`@ghia/solid`). Nothing here is a git fork:
the upstream is React and DOM, so every file is rewritten, and staying current means reading upstream diffs and
porting them by hand. [`drift/`](drift) records where the port still differs; this file is how to keep it in step.

## The pin is mixed

| Commit | Date | Covers |
| --- | --- | --- |
| `0a0377eaaf4ab248773642ea0f299acc3f7958d7` (Merge PR #69) | 2026-10-11 | Every component, demo and page not listed below, and the `@base-ui/react` 1.9.0 audit in [BASE-UI-AUDIT.md](https://github.com/fdarian/ghia-base-ui/blob/main/BASE-UI-AUDIT.md) |
| `d5c36065b8a351a3f248b496b03b2bdcef58d682` (feat(og): build the OG image in code at /og) | 2026-10-14 | The site nav and the Changelog page |

These are at `d5c3606`, because the live site was the only place they existed (0a0377e predates the Changelog and
the release-driven New dots):

| Port file | Upstream |
| --- | --- |
| `content/changelog/2026-07.md`, `2026-08.md`, `2026-09.md` (verbatim copies) | `content/changelog/*` |
| `src/lib/changelog/` (`parse`, `load`, `install`, `kind-style`, `migration-prompt`, `upgrade-prompt`) | `lib/changelog/*` (no `markdown.ts`: the port has no Markdown route) |
| `src/lib/changelog/releases.ts` | `lib/changelog/marks.tsx` (the New / Updated marks, as the nav's New dots) |
| `src/pages/changelog.tsx`, `src/pages/changelog/` | `app/changelog/page.tsx`, `changelog-view.tsx`, `previews.tsx` |
| `NavGroup` and `AppSidebar` in `src/app.tsx` (headers and counts, Search row, scroller, New dots, the page `Rail`) | `app/components/sidebar.tsx`, `sidebar-layout.tsx`, `right-panel.tsx` |
| `SidebarContent`'s edge fade, end hairline and blur-clear in `src/components/sidebar.tsx` | the same nav's scroller |
| `src/lib/site-command-menu.tsx`, `src/lib/page-nav.ts` (Changelog's row and place in the order) | `app/components/site-command-menu.tsx`, `lib/docs/command-menu-items.ts` |

The rest of the site shell entries in [drift/site.md](drift/site.md) and the site-nav section of
[drift/sidebar.md](drift/sidebar.md) say which refs are `d5c3606`'s. Everything else keeps its `0a0377e` pin in
the header of its drift file: `grep -ln 0a0377e drift/*.md` lists it, so a file leaves that list when you re-audit it.

## Syncing with upstream

The reference clone is `~/.claude/notes/ff-source/`. If it is gone:

```bash
git clone https://github.com/mickadesign/fluid-functionalism ~/.claude/notes/ff-source
```

1. **Catch up what is still at `0a0377e`.** Everything upstream changed between the two pins applies to the files
   not listed in the table above:

   ```bash
   git -C ~/.claude/notes/ff-source diff 0a0377e d5c3606 -- registry/ app/ lib/ hooks/ content/
   ```

   The component changes that matter to the port are
   `registry/base/{accordion,button,checkbox-group,dialog,mobile-drawer,sidebar,slider,switch,thinking-steps,tooltip}.tsx`,
   `registry/default/input-message.tsx`, the new `registry/default/lib/omit.ts` and `app/globals.css`. The rest is
   `app/docs/*` pages (copy, playback metadata) and the registry, install and skill tooling the port does not have.
2. **Then move to upstream's head.**

   ```bash
   git -C ~/.claude/notes/ff-source fetch
   git -C ~/.claude/notes/ff-source diff d5c3606 origin/main -- registry/ app/ lib/ hooks/ content/
   ```

   Run both ranges per file when a file is still at `0a0377e`; run the second alone for the ones in the table.
3. **Port each change** to the file the [map](#file-map) names, and update the `file:line` refs in its drift file.
   When the change touches a `registry/base/*` file, decide first where it lands: keys, selection, open state, focus
   and ARIA belong to the primitive in [`ghia-base-ui`](https://github.com/fdarian/ghia-base-ui) (port it there, with its own `UPSTREAM.md` procedure,
   release it, bump the pin in `package.json`, and re-audit its rows in [BASE-UI-AUDIT.md](https://github.com/fdarian/ghia-base-ui/blob/main/BASE-UI-AUDIT.md)); styling, tokens, springs and fluid hover stay in `src/`.
4. **Move the pin.** Change the commit in the drift file's header (and the table above when the whole group moves).
   When no `0a0377e` is left, collapse this file to one pin.
5. **Changelog.** `content/changelog/*.md` is copied verbatim: copy new months in as they land. The parser is a line
   scanner for the strict shape `changelog-guidelines.md` upstream defines, not an mdast walk, so a change to the
   format in `lib/changelog/parse.ts` has to be ported to `src/lib/changelog/parse.ts`; `scripts/check-changelog.ts`
   covers it.
6. `pnpm check`, then `pnpm screenshots` for the pages touched.

## File map

Upstream paths are relative to the repository root. Grouped rows are fine to read as "each file in the left cell
lands in the matching file on the right"; the drift file's `Original:` header names the exact files.

| Upstream | Port |
| --- | --- |
| `registry/base/<x>.tsx`, `registry/default/<x>.tsx`, `registry/blocks/queued-stack.tsx` | `src/components/<x>.tsx` |
| `registry/default/{menu-item,dropdown-search}.tsx` (and `dropdown-sub.tsx`) | `src/components/{menu-item,dropdown-search,dropdown}.tsx` |
| `registry/default/{sidebar-core,sidebar-menu}.tsx` over `registry/base/sidebar.tsx`; `registry/default/{nav-menu,nav-item}.tsx` | `src/components/sidebar.tsx`; `nav-menu.tsx`, `nav-item.tsx` |
| `app/docs/<x>/page.tsx`, `lib/docs/playgrounds/<x>.tsx` | `src/demos/<x>.tsx` (the sidebar demo's pieces in `src/demos/sidebar/`) |
| `app/docs/{motion,scrollbars,sizes,skill,surfaces,typography,fluid-hover}/` and `app/docs/page.tsx` | `src/pages/<x>.tsx` and `src/pages/<x>/`; the docs page is `src/pages/introduction.tsx` |
| `app/compare/`, `app/components/{shadcn,compare-fluid}-previews.tsx`, `components/shadcn/` | `src/pages/compare.tsx`, `src/pages/compare/` (`shadcn/` is the Solid redraw) |
| `app/concepts/` | `src/pages/concepts*.tsx`, `src/pages/concepts/frame.tsx` |
| `app/slider/page.tsx` | `src/pages/audio-mixer.tsx` |
| `app/page.tsx`, `app/components/{bento-grid,bento-card,bento-previews}.tsx` | `src/home/`, and `Showcase` in `src/app.tsx` |
| `app/changelog/`, `lib/changelog/`, `content/changelog/` | `src/pages/changelog*`, `src/lib/changelog/`, `content/changelog/` |
| `app/layout.tsx`, `app/components/{sidebar-layout,right-panel,site-command-menu,playground-menu}.tsx`, `lib/docs/{DocPage,ComponentPreview,PropsTable,playground}.tsx` | `src/main.tsx`, `src/app.tsx`, `src/lib/{app-frame,doc-page,demo-kit,playground,site-command-menu,page-nav}.ts*` |
| `app/globals.css`, `registry/default/lib/{springs,surface-classes,type-scale,font-weight}.ts`, `shape-context.tsx`, `size-context.tsx` | `src/lib/theme.ts` (tokens, springs, shadows) |
| `registry/default/hooks/use-fluid-hover.ts`, `registry/default/fluid-hover-highlight.tsx` | `src/lib/fluid-hover.ts`, `src/lib/fluid-highlight.tsx` |
| `registry/default/lib/{popup.ts,surface-context.tsx,elevated.tsx}` | `src/lib/{popup,surface-context}.ts*` (the chrome; placement is `base-ui:src/internals/use-anchor-positioning.ts`) |
| `registry/default/hooks/use-keyboard-nav-gate.ts` | `base-ui:src/select/root/use-select-root.ts` (`keyboardNav`), read in `src/components/select.tsx` |
| `registry/default/lib/icon-context.tsx`, `icons-*.tsx`, `lib/icons-*.ts` | `src/lib/icons.ts`, `src/lib/icon.tsx`, `src/lib/icons/` |
| `public/fonts/InterVariable*.ttf` | `assets/fonts/InterVariable*.ttf` (same files) |
| `public/og.png` | `assets/chat-ai/og.png` |
| `public/micka.png` | not ported; replaced by `assets/chat-ai/avatar.jpg` (see the "Sample photo" entries in `drift/`) |
| `lib/typeset/generate.ts`, `lib/docs/typeset-sample.tsx` | `src/pages/typography/` |

Not ported, by design: the `registry/radix/` flavour (the port is Base UI only), the shadcn registry build and
`/r/*` routes, `lib/preset/`, `skills/`, the Markdown routes, `tests/`, and `registry/blocks/{sidebar-app,
dialog-sidebar,sidebar-*}` ([drift/sidebar.md](drift/sidebar.md#blocks-workspace-header-user-footer-app-sidebar-inset-top-bar-settings-dialog)).
Install is a copy prompt (`src/lib/install-url.ts`, `src/lib/starter-prompt.ts`), not a CLI.

## Base UI primitives

Upstream's `registry/base/*` builds on `@base-ui/react` 1.9.0. Here the same components consume `ghia-base-ui` (npm, pinned in `package.json`),
headless Solid primitives from [fdarian/ghia-base-ui](https://github.com/fdarian/ghia-base-ui), whose own `UPSTREAM.md` pins and syncs Base UI. A Base UI behaviour change is ported there, not here; this repository
tracks how FF uses a primitive and what it styles on top, which
[BASE-UI-AUDIT.md](https://github.com/fdarian/ghia-base-ui/blob/main/BASE-UI-AUDIT.md) records row by row. In the file map above, a `base-ui:src/...`
path is in that repository, read at its commit `77a5eb0`.

Which part of a `registry/base/*` file is a primitive in `base-ui:src/`:

| FF component | Primitive folder in `base-ui:src/` |
| --- | --- |
| `accordion`; `thinking-steps` | `accordion`; `collapsible` |
| `tabs`, `tabs-subtle` | `tabs` |
| `checkbox-group`, `radio-group` (the choice-group engine) | `checkbox`, `checkbox-group`, `radio`, `radio-group` |
| `switch`, `slider` | `switch`, `slider` |
| `dropdown`, `menu-item`, `dropdown-search` | `menu` |
| `color-picker` (the format menu and the popover; the colour maths and fields stay here) | `menu`, `popover` |
| `select`, `combobox` | `select`, `combobox` (form value in `utils/`) |
| `dialog`, `mobile-drawer`, `tooltip`, `scroll-area` | `dialog`, `drawer`, `tooltip`, `scroll-area` |

Stays here because Base UI has no counterpart: `command-menu`, `sidebar`, `nav-item`, `nav-menu`, `input-message`,
`color-picker` (its colour maths and fields), `carousel-dots`, `queued-stack`, `ask-user-questions`, the cards, fluid hover and the focus ring. Where
they need list navigation, presence or pointer capture they import it from `ghia-base-ui`.

## Deviations

Each file in [`drift/`](drift) lists every place the port looks or behaves differently from upstream, with the
source and port `file:line` and a **Cause**. The per-file counts are the table in the README's
[Drift from the source](README.md#drift-from-the-source) (as of its last recount: 497 entries, 46 of them naming two
causes; `bun scripts/drift-counts.ts` prints them).

- **`gpuix gap`** (49 entries): gpuix lacks the capability or gets it wrong, so the port approximates or drops
  it. The recurring ones (selector `:has(.x)` and group-has, a clip inside a transformed box, the `layout` glides) are collected in
  README's [gpuix gaps across components](README.md#gpuix-gaps-across-components); the per-file entry is one line
  linking there. Most in [select](drift/select.md), [combobox](drift/combobox.md), [command-menu](drift/command-menu.md),
  [slider](drift/slider.md), [site](drift/site.md), [banner](drift/banner.md) and [input-message](drift/input-message.md).
- **`port choice`** (219): the port differs on purpose, for a desktop window or a simpler shape. The window frame,
  the single fixed layout and the Base-UI-only install live in [site](drift/site.md); the largest block is the
  Concepts screens, [concepts](drift/concepts.md).
- **`not ported yet`** (183): nothing stops the port doing it and nobody has. The backlog: [site](drift/site.md)
  (responsive layout, settings persistence, the API Reference tables), [sidebar](drift/sidebar.md) (collapse, mobile
  sheet, blocks), [color-picker](drift/color-picker.md) and [input-message](drift/input-message.md).
- **Mixed** (46): an entry that names two causes, counted separately; the cause line says which part is which.
  Entries with no cause (exact or additive notes) are not counted.
