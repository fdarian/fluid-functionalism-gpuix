# ask-user-questions

Original: `registry/default/ask-user-questions.tsx` (1,880 lines, on Base UI `RadioGroup` / `CheckboxGroup` / `Field`) and `app/docs/ask-user-questions/page.tsx`. Ported in `src/components/ask-user-questions.tsx`, demo in `src/demos/ask-user-questions.tsx` (every docs example except the playground).

## CSS transforms (footer buttons scale in)

- **Original:** each footer button is a `motion.div` in `AnimatePresence mode="popLayout"`, scaling from 0.85 while it fades in and out.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`). `popLayout` itself exists.
- **Workaround:** `FadeIn` is a 100 ms opacity fade on mount (`src/components/ask-user-questions.tsx:1060-1072`) and a button that goes away is removed at once; the exit is not ported.
- **Fidelity:** approximated (no scale).
- **Components it hits:** any list whose items scale in or out.
