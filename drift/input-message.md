# input-message

Original: `registry/default/input-message.tsx`. Ported in `src/components/input-message.tsx`, demo in `src/demos/input-message.tsx`.

## Send-button morph, tile and row enter

- **Original:** the arrow and the stop square swap in wait mode with `scale` 0.6 to 1; attachment tiles and queued rows enter with `scale` 0.9 / 0.97.
- **gpuix lacks:** scale. Transforms are the known gap.
- **Workaround:** opacity fades only, on `tween.fast`: the glyph swap in `SendButton` (`input-message.tsx:207-215`, remounted per glyph by `<For each>`), `FilePreviewTile` (`:290`) and `QueuedRow` (`:370`).
- **Fidelity:** approximated.
- **Components it hits:** queued-stack, chat-message, any scale-in.
