# <component>

Original: `registry/base/<component>.tsx` (or `registry/default/`), demo in `app/docs/...` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/<component>.tsx`,
demo in `src/demos/<component>.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, variable-font axes, `text-box-trim`, `text-wrap: balance`, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## <short name of the drift>

- **Cause:** `gpuix gap` | `port choice` (why) | `not ported yet`.
- **Original:** what the source does, with its `file:line`.
- **Port:** what this port does instead, with its `file:line`.
- **gpuix lacks:** only when the cause is `gpuix gap`: what is missing or wrong, with the gpuix `file:line` when known (e.g. `packages/native/src/events/key_names.rs:10-17`).
- **Workaround:** what the port does to get close, or `none`.
- **Fidelity:** `exact` | `approximated` (how) | `dropped`.
- **Components it hits:** just this one, or any others you noticed.
