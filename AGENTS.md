Solid app that draws the [Fluid Functionalism](https://fluidfunctionalism.com) component library on [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine: every component, demo and page of the source site, with its fluid hover, springs and keyboard behaviour. It is a port, so most work is closing or recording a difference from the source. [README.md](README.md) is the overview (run it, add a component, the gpuix gaps and bugs, the drift table); [UPSTREAM.md](UPSTREAM.md) says which upstream commit each file tracks and how to sync.

## Stack
- Solid JSX on `@ghia/solid` and `@ghia/native` from npm (source and docs: [fdarian/ghia](https://github.com/fdarian/ghia); `docs/reference.md` is the API, `docs/fork/` says where it differs from the DOM; refs into them read `ghia:docs/<path>:lines`, read at `730f77f1`). Elements are gpuix's (`<div>`, `<text>`, `<anchored>`, `motion.*`) with style objects, not HTML and CSS classes.
- Bun runs everything, with the Solid transform and the demo/page/changelog registry as preloads (`bunfig.toml`): no build step to develop. `pnpm build` compiles one binary. pnpm 12 installs. TypeScript 7 (`tsc`), Biome (tabs, single quotes), path alias `#/*` -> `src/*`.
- Behaviour primitives (keys, selection, open state, focus, ARIA) come from `ghia-base-ui` on npm (source: [fdarian/ghia-base-ui](https://github.com/fdarian/ghia-base-ui); `base-ui:` paths are in that repo). This repo keeps styling, springs and fluid hover.

## Folders
- `src/components/` — the ported components, styled with tokens from `src/lib/theme.ts`. Each consumes its base-ui primitive where Base UI has one.
- `src/demos/` — one file per component page (`title`, `group`, `Demo`, optional `scenarios` for screenshots); `src/lib/demo.ts` reads them through the `virtual:demos` module.
- `src/pages/`, `src/home/` — the site's own pages (Introduction, Changelog, the System pages, Compare, Concepts, Audio Mixer) and the home bento grid; `src/app.tsx` is the shell and sidebar, `src/main.tsx` the entry.
- `src/lib/` — shared code: `theme.ts` (tokens, springs, shadows), `fluid-hover.ts` / `fluid-highlight.tsx`, `focus-ring.tsx`, `popup.tsx`, `demo-kit.tsx`, `doc-page.tsx`, icons. The table is in README under "Shared code".
- `src/cli.ts` — the npx shim, the only code the npm package ships (`dist/cli.js`): downloads, verifies and runs the darwin-arm64 binary from the GitHub Release. It imports nothing from the app.
- `scripts/` — `check-*.tsx` scenario checks (each runnable alone with `bun scripts/check-x.tsx`), `check-kit.tsx` (their harness), `screenshots.tsx`, the two runners.
- `drift/` — one markdown file per component or page listing every place the port differs from the source, with a Cause. [`drift/_TEMPLATE.md`](drift/_TEMPLATE.md) is the shape; README's table counts the entries.
- `screenshots/`, `content/changelog/`, `assets/` — captures per page, the verbatim upstream changelog, fonts and images.

## Commands
- `pnpm install` — from this directory only. `pnpm start` runs the app; `pnpm check:type` is `tsc`.
- `pnpm check:scenarios` takes about 30 minutes, so run `bun scripts/check-<component>.tsx` for the component you touched and `pnpm check` before merging.
- `pnpm screenshots [slug]` — one page, or about 25 minutes for all of them.
- `pnpm perf [slug...] --label x` — live frame times on the real window into `perf/<label>.json` (README, "Harness and shared-lib notes"); results are not committed.
- `pnpm footprint [slug...] --label x` — idle CPU and memory per page in a fresh compiled child, headless; `--window` for a real window, `--tour` for what a session leaves behind (README, "Harness and shared-lib notes"); results land in `perf/`.
- `pnpm build` — `dist/fluid-functionalism` (Bun compile) and `bundle/Fluid Functionalism.app`; needs `cargo install cargo-packager --locked` (README, "Build the app").
- `pnpm format` — Biome.
- `pnpm changeset` — describe a change; merging the Version Packages PR runs `.github/workflows/release.yml`. `ci:release` (`bun scripts/release-build.ts`, then `changeset publish`) writes `dist/cli.js`, `dist/checksums.json` and `dist/releases/*.tar.gz`; run it only in CI. `ci.yml` runs `scripts/check-single-instance.ts`.

## Rules
- `@ghia/solid`, `@ghia/native` and `ghia-base-ui` are pinned to exact versions in `package.json`. `ghia-base-ui` peer-depends on `@ghia/solid` and `solid-js`; a second copy of either gives two renderers or reactive graphs and silent breakage. `scripts/check-single-instance.ts` catches it.
- A behaviour change (keys, selection, ARIA, open state, typeahead, presence) goes into the primitive in `ghia-base-ui`, not into a component here (release it, then bump the pin). A look change (tokens, motion, fluid hover) stays here. Its `BASE-UI-AUDIT.md` (in the repo, not the npm package) records where the primitives differ from Base UI.
- A component adds `src/components/<name>.tsx`, `src/demos/<name>.tsx` and `drift/<name>.md` and edits no shared file. Whenever code the drift file cites moves, its `file:line` refs move with it; refs into the primitives read `base-ui:src/<path>:lines`.
- gpuix cannot do some things the source does (transforms, selector `:has(.x)` and group-has). Record the approximation in the drift file and link the README gap row; do not paper over it.
- Screenshot diffs are noisy: playground variants use `Math.random`, and the caret and timing demos vary run to run. Compare the content area by pixels, not hashes, and do not recommit `screenshots/` for noise.
- The compiled binary reads nothing from the repo. A runtime asset is an embedded import (`with { type: 'file' }`); an image `src` goes through `diskPath` in `src/lib/assets.ts`, because gpuix's Rust loader cannot read `$bunfs`. Never build a path from `import.meta.url` or `import.meta.dir`, or scan a directory at runtime. Demos, pages and the changelog are found through the `virtual:*` modules of `scripts/registry-plugin.ts`, so a new demo still just adds its file.
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
