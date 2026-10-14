# <component>

Original: `registry/base/<component>.tsx` (or `registry/default/`). Ported in `src/components/<component>.tsx`, demo in `src/demos/<component>.tsx`.

One entry per gap. Only gpuix gaps worth knowing about: transforms are already known, so link to them rather than re-reporting.

## <short name of the gap>

- **Original:** what the DOM / Tailwind / library version does.
- **gpuix lacks:** what is missing or behaves differently, with the gpuix `file:line` when known (e.g. `packages/native/src/motion.rs:12`).
- **Workaround:** what this port does instead, or `none`.
- **Fidelity:** `exact` | `approximated` (how) | `dropped`.
- **Components it hits:** just this one, or any others you noticed.
