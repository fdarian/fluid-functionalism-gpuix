Solid app that draws the [Fluid Functionalism](https://fluidfunctionalism.com) component library on [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine: every component, demo and page of the source site, with its fluid hover, springs and keyboard behaviour. It is a port, so most work is closing or recording a difference from the source. [README.md](README.md) is the overview (run it, add a component, the gpuix gaps and bugs, the drift table); [UPSTREAM.md](UPSTREAM.md) says which upstream commit each file tracks and how to sync.

## Stack
- Solid JSX on `@gpuix/solid` (fork at `~/code/fdarian/gpuix`, a sibling checkout; its `README.md` and `FORK.md` are the gpuix reference). Elements are gpuix's (`<div>`, `<text>`, `<anchored>`, `motion.*`) with style objects, not HTML and CSS classes.
- Bun runs everything, with the Solid transform as a preload (`bunfig.toml`): no build step. pnpm 12 installs. TypeScript 7 (`tsc`), Biome (tabs, single quotes), path alias `#/*` -> `src/*`.
- Behaviour primitives (keys, selection, open state, focus, ARIA) come from `base-ui-solid-gpuix`, the sibling repo `../base-ui-solid-gpuix`. This repo keeps styling, springs and fluid hover.

## Folders
- `src/components/` — the ported components, styled with tokens from `src/lib/theme.ts`. Each consumes its base-ui primitive where Base UI has one.
- `src/demos/` — one file per component page (`title`, `group`, `Demo`, optional `scenarios` for screenshots); `src/lib/demo.ts` globs them at startup.
- `src/pages/`, `src/home/` — the site's own pages (Introduction, Changelog, the System pages, Compare, Concepts, Audio Mixer) and the home bento grid; `src/app.tsx` is the shell and sidebar, `src/main.tsx` the entry.
- `src/lib/` — shared code: `theme.ts` (tokens, springs, shadows), `fluid-hover.ts` / `fluid-highlight.tsx`, `focus-ring.tsx`, `popup.tsx`, `demo-kit.tsx`, `doc-page.tsx`, icons. The table is in README under "Shared code".
- `scripts/` — `check-*.tsx` scenario checks (each runnable alone with `bun scripts/check-x.tsx`), `check-kit.tsx` (their harness), `screenshots.tsx`, the two runners.
- `drift/` — one markdown file per component or page listing every place the port differs from the source, with a Cause. [`drift/_TEMPLATE.md`](drift/_TEMPLATE.md) is the shape; README's table counts the entries.
- `screenshots/`, `content/changelog/`, `assets/` — captures per page, the verbatim upstream changelog, fonts and images.

## Commands
- `pnpm install` — from this directory only. `pnpm start` runs the app; `pnpm check:type` is `tsc`.
- `pnpm check:scenarios` takes about 30 minutes, so run `bun scripts/check-<component>.tsx` for the component you touched and `pnpm check` before merging.
- `pnpm screenshots [slug]` — one page, or about 25 minutes for all of them.
- `pnpm format` — Biome.

## Rules
- Install from this repo's root. `../base-ui-solid-gpuix` is a pnpm workspace member linked with `link:`; a bare `pnpm install` inside it links a second `@gpuix/solid`, which gives two renderers and silent breakage. `scripts/check-single-instance.ts` catches it. Rebuilding gpuix's dist needs a `pnpm install` here to refresh the `file:` copy.
- A behaviour change (keys, selection, ARIA, open state, typeahead, presence) goes into the primitive in `base-ui-solid-gpuix`, not into a component here. A look change (tokens, motion, fluid hover) stays here. Its `BASE-UI-AUDIT.md` records where the primitives differ from Base UI.
- A component adds `src/components/<name>.tsx`, `src/demos/<name>.tsx` and `drift/<name>.md` and edits no shared file. Whenever code the drift file cites moves, its `file:line` refs move with it; refs into the primitives read `base-ui:src/<path>:lines`.
- gpuix cannot do some things the source does (transforms, intrinsic width, variable fonts, `text-box-trim`). Record the approximation in the drift file and link the README gap row; do not paper over it.
- Screenshot diffs are noisy: playground variants use `Math.random`, and the caret and timing demos vary run to run. Compare the content area by pixels, not hashes, and do not recommit `screenshots/` for noise.
- Source filenames are kebab-case; `src/` imports across directories use `#/`.

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

Do not hand-edit generated OpenWiki pages unless explicitly asked; update source code/docs and regenerate the wiki with the OpenWiki agent.

<!-- OPENWIKI:END -->
