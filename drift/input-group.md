# input-group

Original: `registry/default/input-group.tsx`, demo in `app/docs/input-group/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/input-group.tsx`,
demo in `src/demos/input-group.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## Fill, ring and icon colour change instantly

- **Cause:** `not ported yet`.
- **Original:** the field box has `transition-all duration-80` (`input-group.tsx:239`), so the fill and ring colours ease; the icon has `transition-[color,stroke-width] duration-80` (`:251`).
- **Port:** `fill()` switches the layer's `backgroundColor` and `outlineColor` at once (`input-group.tsx:122-132,188-202`), and `Icon` is used without its `fade` prop (`:205-211`, `lib/icon.tsx:11`). The fork animates colours, `backgroundColor` and `outlineColor` included (`~/code/fdarian/gpuix/FORK.md:814-815`).
- **Fidelity:** approximated (the 80 ms fade is dropped). The stroke 1.5 to 2 is instant by design: README "icon stroke 1.5 to 2 on hover".
- **Components it hits:** input-copy, input-message.

## A press on the field's padding or label focuses on release

- **Cause:** `not ported yet`.
- **Original:** the field box takes `onMouseDown`, focuses the input and cancels the default, unless the target is the input itself, so the caret is left alone (`input-group.tsx:226-233`). The label is a `Field.Label` with `htmlFor` (`:193`).
- **Port:** `onClick={focusInput}` on the label and the field box (`input-group.tsx:157,175`): the focus lands on release, and a click on the input also calls `focusElement`. Whether that disturbs the caret was not checked.
- **Fidelity:** approximated.

## No Base UI Field wiring

- **Cause:** `not ported yet`.
- **Original:** `Field.Root` / `Label` / `Control` / `Error` give `htmlFor`, `aria-invalid`, and `aria-describedby` pointing at the error message (`input-group.tsx:173-190,258-288`).
- **Port:** `aria-label={props.label}` only (`input-group.tsx:222`); no `aria-invalid`, no description link to the error. gpuix accepts `aria-*` and `<label htmlFor>` (`FORK.md:455`).
- **Fidelity:** approximated (the name is right, the error is not announced with the field).

## Props are fixed, not passed through

- **Cause:** `not ported yet` (`icon` as a name is `port choice`: icons are SVG strings, `lib/icons.ts`).
- **Original:** `InputField` forwards `...props` (`type`, `name`, `autoComplete`, `onKeyDown`, …) to the control, plus `className` and `ref`; `InputGroup` forwards `className`, `ref` and HTML attributes (`input-group.tsx:93-122,258-272,44-84`). `icon` is a component. The group is `w-72 max-w-full` (`:78`).
- **Port:** a fixed prop list (`input-group.tsx:91-104`), `testId` added, `icon` an `IconRef`. The group is `width: 288, minWidth: 0, flexShrink: 1` (`:80-82`), which approximates `max-w-full`.
- **Fidelity:** dropped.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** the group sets a `SizeProvider` from `size`, and `useSize()` inside each field follows it (`registry/default/input-group.tsx:87`, `:130-132`).
- **Port:** An omitted `size` follows the Size row (`input-group.tsx:69`); a given one reaches the fields through `GroupContext` (`:42-55`), and nothing is provided to other components in the group.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with `size`.

## IME composition, static weights

- **Cause:** `gpuix gap`. One line each: IME composition (README "Missing features", combobox row, which lists input-group), and the variable-font weight and `opsz` on the label, input and error (`input-group.tsx:206,217,270,284`; README variable-font row).

## Demo page

- **Cause:** `port choice` (the demo is a showcase card, not a docs page; reason not stated beyond that).
- **Original:** `app/docs/input-group/page.tsx`: Basic (one field, Search icon), Multiple Fields (Name, Email with Mail icon), Error State (`bad@`), each in a `ComponentPreview` with code, then two props tables.
- **Port:** the same three, in `DemoCard`s (`src/demos/input-group.tsx`), with the default and a compact group side by side and the default error field next to a compact one and a disabled one. Extras: compact, compact error, disabled. `labelHidden` is not shown in either demo. Code snippets and props tables are not ported.
- **Fidelity:** all source variants present; three extra.
