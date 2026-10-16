# chat-message

Original: `registry/default/chat-message.tsx`. Ported in `src/components/chat-message.tsx`, demo in `src/demos/chat-message.tsx`.

## CSS transforms (the entrance scales)

- **Original:** a new message enters with an 8px rise and `scale: 0.96` about its `transform-origin`.
- **gpuix lacks:** `scale` and `transform-origin` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** opacity and the 8px rise on `top` on the `moderate` spring, with no scale (`src/components/chat-message.tsx:19`, `:92-96`).
- **Fidelity:** approximated.
- **Components it hits:** any entrance that scales.
