# input-group

Original: `registry/default/input-group.tsx`, demo in `app/docs/input-group/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/input-group.tsx`,
demo in `src/demos/input-group.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## The compact error message is a size too small

- **Cause:** `not ported yet` (the wrong token is used). A bug, listed in the report.
- **Original:** compact uses the caption role at its compact step, 11px on a 14px line (`input-group.tsx:282`; `lib/type-scale.ts`).
- **Port:** `steps.compact.caption` is `scale.microCompact`, 10px on a 12px line (`input-group.tsx:34`). `lib/theme.ts:265-274` has no compact caption token. Default is right: `scale.caption`, 12/16.
- **Fidelity:** approximated (1px smaller, 2px shorter line).

## Fill, ring and icon colour change instantly

- **Cause:** `not ported yet`.
- **Original:** the field box has `transition-all duration-80` (`input-group.tsx:239`), so the fill and ring colours ease; the icon has `transition-[color,stroke-width] duration-80` (`:251`).
- **Port:** `fill()` switches the layer's `backgroundColor` and `outlineColor` at once (`input-group.tsx:122-132,188-202`), and `Icon` is used without its `fade` prop (`:205-211`, `lib/icon.tsx:11`). The fork animates colours, `backgroundColor` and `outlineColor` included (`~/code/fdarian/gpuix/FORK.md:814-815`).
- **Fidelity:** approximated (the 80 ms fade is dropped). The stroke 1.5 to 2 is instant by design: README "icon stroke 1.5 to 2 on hover".
- **Components it hits:** input-copy, input-message.

## A disabled field is read-only, not disabled

- **Cause:** `not ported yet`. A bug, listed in the report.
- **Original:** `Field.Root disabled` disables the input, which leaves the Tab order (`input-group.tsx:177-189`).
- **Port:** `readOnly={props.disabled}` (`input-group.tsx:223`). The wrapper's `pointerEvents: "none"` stops the mouse, but Tab still focuses the field and shows the caret. gpuix has `disabled` on inputs, never focusable (`FORK.md:451,481`).
- **Fidelity:** approximated.
- **Components it hits:** input-message (textarea, `readOnly` at `input-message.tsx:1058`).

## A press on the field's padding or label focuses on release

- **Cause:** `not ported yet`.
- **Original:** the field box takes `onMouseDown`, focuses the input and cancels the default, unless the target is the input itself, so the caret is left alone (`input-group.tsx:226-233`). The label is a `Field.Label` with `htmlFor` (`:193`).
- **Port:** `onClick={focusInput}` on the label and the field box (`input-group.tsx:157,175`): the focus lands on release, and a click on the input also calls `focusElement`. Whether that disturbs the caret was not checked.
- **Fidelity:** approximated.

## No Base UI Field wiring

- **Cause:** `not ported yet`.
- **Original:** `Field.Root` / `Label` / `Control` / `Error` give `htmlFor`, `aria-invalid`, and `aria-describedby` pointing at the error message (`input-group.tsx:173-190,258-288`).
- **Port:** `aria-label={props.label}` only (`input-group.tsx:220`); no `aria-invalid`, no description link to the error. gpuix accepts `aria-*` and `<label htmlFor>` (`FORK.md:455`).
- **Fidelity:** approximated (the name is right, the error is not announced with the field).

## Props are fixed, not passed through

- **Cause:** `not ported yet` (`icon` as a name is `port choice`: icons are SVG strings, `lib/icons.ts`).
- **Original:** `InputField` forwards `...props` (`type`, `name`, `autoComplete`, `onKeyDown`, …) to the control, plus `className` and `ref`; `InputGroup` forwards `className`, `ref` and HTML attributes (`input-group.tsx:93-122,258-272,44-84`). `icon` is a component. The group is `w-72 max-w-full` (`:78`).
- **Port:** a fixed prop list (`input-group.tsx:91-104`), `testId` added, `icon` an `IconRef`. The group is `width: 288, minWidth: 0, flexShrink: 1` (`:80-82`), which approximates `max-w-full`.
- **Fidelity:** dropped.

## Ambient size

- **Cause:** `not ported yet`. README lists the Size row as not ported.
- **Original:** `useSize()` inside each field follows the `SizeProvider` the group sets from `size` or inherits (`input-group.tsx:130-132`).
- **Port:** the group's `size` prop through `GroupContext` (`input-group.tsx:42-55,67-70`); no inheritance from an outer provider.
- **Fidelity:** approximated.
- **Components it hits:** every component with `size`.

## IME composition, static weights

- **Cause:** `gpuix gap`. One line each: IME composition (README "Missing features", combobox row, which lists input-group), and the variable-font weight and `opsz` on the label, input and error (`input-group.tsx:206,217,270,284`; README variable-font row).

## Demo page

- **Cause:** `port choice` (the demo is a showcase card, not a docs page; reason not stated beyond that).
- **Original:** `app/docs/input-group/page.tsx`: Basic (one field, Search icon), Multiple Fields (Name, Email with Mail icon), Error State (`bad@`), each in a `ComponentPreview` with code, then two props tables.
- **Port:** the same three, in `DemoCard`s (`src/demos/input-group.tsx:20,33,75`), with the default and a compact group side by side (`:33-74`) and the error field next to a disabled one (`:75-100`). Extras: compact, disabled. `labelHidden` is not shown in either demo. Code snippets and props tables are not ported.
- **Fidelity:** all source variants present; two extra.
