# Third-party notices

This port's own terms are in `LICENSE`: the upstream MIT licence (Micka Touillaud) plus the port's copyright line.
Everything below is bundled in the repository and carries its own terms. Versions are the ones the upstream
lockfile (`package-lock.json` at the pinned commit, see [UPSTREAM.md](UPSTREAM.md)) resolves.

## Ported source

The components, demos, pages, theme tokens and the changelog (`content/changelog/`) are ported from
**[Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism)** (MIT, Copyright (c) 2026 Micka
Touillaud). File-by-file mapping is in [UPSTREAM.md](UPSTREAM.md).

`src/pages/compare/shadcn/` redraws the `components/shadcn/*` files the upstream Compare page copies from
**[shadcn/ui](https://github.com/shadcn-ui/ui)** (MIT, Copyright (c) 2023 shadcn).

## Fonts

**[Inter](https://github.com/rsms/inter)**, static Regular, Medium, SemiBold and Bold cuts in `assets/fonts/`
(SIL Open Font License 1.1, Copyright (c) 2016 The Inter Project Authors). The licence text is
`assets/fonts/LICENSE.txt`; it travels with the font files.

## Icon glyph data

`src/lib/icons/` holds the path data of 50 glyphs from each of the five libraries the upstream "Icons" setting
switches between. The data is copied, not imported: this repository has no icon package dependency.

| File in `src/lib/icons/` | Library | Licence | Copyright holder |
| --- | --- | --- | --- |
| `lucide.ts` | [Lucide](https://github.com/lucide-icons/lucide) (`lucide-react` 0.564.0) | ISC | Lucide Contributors; portions Cole Bemis 2013-2026 as part of [Feather](https://github.com/feathericons/feather) (MIT) |
| `tabler.ts` | [Tabler Icons](https://github.com/tabler/tabler-icons) (`@tabler/icons` 3.41.1) | MIT | Paweł Kuna, 2020-2026 |
| `phosphor-light.ts`, `phosphor-regular.ts` | [Phosphor](https://github.com/phosphor-icons/core) (`@phosphor-icons/react` 2.1.10, which bundles `@phosphor-icons/core`) | MIT | Phosphor Icons, 2020 (react) and 2023 (core) |
| `hugeicons.ts` | [Hugeicons](https://github.com/hugeicons/hugeicons) free set (`@hugeicons/core-free-icons` 4.1.1) | MIT, see below | Hugeicons, 2025 |
| `untitledui.ts` | [Untitled UI Icons](https://github.com/untitleduico/icons) (`@untitledui/icons` 0.0.22) | **Custom, not MIT**, see below | Untitled UI, 2025 |

### Hugeicons

The npm package declares `MIT` in `package.json`, ships no licence file, and its README says "All rights
reserved". The GitHub repository's `LICENSE.md` is the MIT text (Copyright (c) 2025 Hugeicons), and its README
states that the free icons and all source are MIT, usable and redistributable in personal and commercial projects;
only the separate Pro packs (`@hugeicons-pro/*`) are restricted. This file follows the repository. The mismatch is
in Hugeicons' own packaging.

### Untitled UI Icons

`@untitledui/icons` declares `MIT` in `package.json`, but the `LICENSE` file inside the package, and the
repository's, is not MIT. It reads:

> You are allowed to: use the icons in personal and commercial projects.
>
> You are not allowed to: sell, sublicense, or distribute the icons (in original or modified form); create
> derivative icon libraries based on the icons; use the icons in any form of UI kit, library, or template intended
> for resale.
>
> Please read the full License Agreement at untitledui.com/license. (c) 2025 Untitled UI

`src/lib/icons/untitledui.ts` is the glyph data, extracted into a source file. Distributing it (publishing this
repository, or a package built from it) falls under "distribute the icons". Keep the repository private, or drop
`untitledui.ts` and the "Untitled UI" option, before publishing. Read the full agreement at
https://www.untitledui.com/license, which was not reviewed here.

## Images

`assets/chat-ai/micka.png` and `assets/chat-ai/og.png` are byte-identical to `public/micka.png` and
`public/og.png` in the upstream repository, and are covered by its MIT licence. `micka.png` is a photograph of a person
(used as a sample avatar); MIT covers copying the file, not the likeness.

## Dependencies not bundled

- **[GPUIX](https://github.com/fdarian/gpuix)** (`@gpuix/solid`, `@gpuix/native`), the renderer; see its
  `THIRD_PARTY_NOTICES.md`.
- **Base UI**: not bundled here. The primitives come from `base-ui-solid-gpuix` (a sibling repository, linked), a
  Solid port of [Base UI](https://github.com/mui/base-ui) (MIT), which carries its own notices.
- **[Solid](https://github.com/solidjs/solid)** (MIT).
