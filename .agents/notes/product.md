What this repo is for, the owner's standing decisions, and what is deliberately not shipped.

## The question it answers

Can gpuix (GPUI-backed renderer, no DOM, no CSS engine) draw [Fluid Functionalism](https://fluidfunctionalism.com) faithfully? The answer is yes, with recorded differences. Every difference from the source is an entry in `drift/` with a Cause, so the repo doubles as a catalogue of what the renderer can and cannot do against a real design system. Gaps found here are reported to [fdarian/ghia](https://github.com/fdarian/ghia).

It is a port, not a fork: the source ([mickadesign/fluid-functionalism](https://github.com/mickadesign/fluid-functionalism), MIT, by Micka Touillaud) is React and Tailwind, every file is rewritten, and staying current means reading upstream diffs and porting them by hand ([UPSTREAM.md](../../UPSTREAM.md)).

## Standing owner decisions

Settled on 2026-10-16 after the first full drift audit. Do not reopen without new evidence, and treat a drift entry that contradicts one as a bug, not a "port choice".

1. **Popup focus matches Base UI.** Focus moves into the popup (Select, Dropdown, the colour picker's format menu, the dropdown's search list and inline panel). The Combobox keeps focus in its input and a row press keeps it there. Select rows set `tabIndex` explicitly instead of through a prop spread: a spread applies after the open has already called `focus()` on the row.
2. **Motion matches the source.** The command menu's scroll rides the same 80 ms spring as its highlight fill; no invented snap windows on accordion or sidebar; no snap while filtering; tabs-subtle's pill width and margin spring on `spring.fast`.
3. **Adopt what the renderer newly makes possible, and correct any comment that describes a limitation the renderer does not have.** Each ghia release is an adoption pass: replace workarounds with the source's own mechanism and delete the workaround and its drift entry together. A stand-in stays only where the mechanism still cannot be expressed, and its drift entry names the exact gap.
4. **Port everything.** Every page of the source site is in scope, so a `not ported yet` drift entry is a backlog item, not an optional one. The README's drift table counts them.

## What is not shipped, and why

- The Untitled UI icon set. Its licence forbids distributing the icons even though the package declares MIT; the Icons row offers four other libraries and the default is Lucide (the source defaults to Untitled UI). Recorded in `drift/site.md`.
- The source's sample photo (`micka.png`): MIT covers the file, not a likeness. The pages that show a sample avatar use `assets/chat-ai/avatar.jpg`, whose origin [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) records, and each carries a "Sample photo" drift entry.
- Image assets ship at twice their largest displayed size (`avatar.jpg` 192 px, `og.png` 400x200). Source resolution costs memory once decoded, not just disk; do not swap in the originals.

## Reference clone

The upstream source is read from a clone at `~/.claude/notes/ff-source/`; [UPSTREAM.md](../../UPSTREAM.md) has the clone command and the sync steps.
