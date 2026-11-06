Choices in the build, compile, lint and type setup that are not visible from the config; read before changing `scripts/build.ts`, `tsconfig.json` or `biome.jsonc`.

## Compiled binary

- `autoloadBunfig: false` in `scripts/build.ts` and the footprint child's build. A compiled Bun binary reads the `bunfig.toml` of the directory it is launched from, and this repo's own carries the Solid transform and registry preloads; launched from a checkout (or from anywhere with a stray `bunfig.toml`) it would pick up that config or a stranger's. Everything it needs is embedded, so it must read none.
- `nativeCjsPlugin` lives in `scripts/native-cjs-plugin.ts` because the app build and the footprint build both need it. `@ghia/native`'s ESM entry loads the addon through `createRequire(import.meta.url)`, which the bundler does not follow, so the plugin points at its CJS entry. The package's test renderer (`dist/*.js`) reaches the ESM entry as `../index.js`, so the plugin redirects that import as well, only when the importer is inside the package's `dist`. Without the redirect the footprint child cannot embed the addon.
- Demo, page and changelog discovery is a file scan: `scripts/registry-plugin.ts` globs `src/demos/*.tsx` and serves `virtual:demos` (likewise pages and the changelog), so nothing lists the demos and parallel work on separate components never collides on a shared registry. The same plugin feeds `Bun.build`, because the binary reads nothing from the repo and a runtime directory scan would find nothing. Its export lists (`DEMO_EXPORTS`, `PAGE_EXPORTS`) must stay in step with `src/lib/demo.ts`.

## drift/ causes

Every `drift/<name>.md` entry has a **Cause**: `gpuix gap` (the renderer lacks it or gets it wrong), `port choice` (different on purpose, with the why) or `not ported yet` (nothing blocks it); an entry naming two counts as mixed. Splitting by cause keeps the backlog actionable: gaps go to ghia, `not ported yet` is in scope by the owner's decision ([product.md](./product.md)), choices are left alone. `bun scripts/drift-counts.ts` prints the README's count table.

When the layout engine puts something where the source does not and no style reproduces it, the port sets the measurement outright and the drift entry records the residue. When the renderer fixes it, delete the measurement and restore the source's structure; the tabs-subtle unfolding label (the source's `fontSize: 16, lineHeight: '24px'` block holding the label directly, pinned by `check-tabs-subtle`) is the model.

## Type checking and lint

- `noUncheckedIndexedAccess` is off in `tsconfig.json`, although the `@total-typescript` base turns it on; enabling it produces about 244 errors (counted 2026-10-17). Turning it on and fixing them is open work.
- Biome skips `perf/` (the frame-time data `pnpm perf` writes, not source). Its a11y rules are off: they misfired about 209 times on gpuix JSX, which is not HTML (gpuix elements carry their own roles and ARIA props). Accessibility is asserted in the check scenarios through gpuix's accessibility tree instead.
