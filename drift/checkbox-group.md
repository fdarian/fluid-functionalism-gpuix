# checkbox-group

Original: `registry/base/checkbox-group.tsx`, with the selected backgrounds in `registry/default/hooks/use-merge-split.tsx`, demo in `app/docs/checkbox-group/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/checkbox-group.tsx` (the row, group and hover machinery it shares with radio-group is in `src/components/choice-group.tsx`), demo in `src/demos/checkbox-group.tsx`.

Same in both (checked against the code): row height, gap and padding per size (36/8/12 and 28/4/10), box 16/14, glyph 18/16, box radius 5/4, 1.5px border, group width 288, hover and selected fills, label colour rule, tab stops (every row), Up/Down wrap, Home/End, Space/Enter on keydown, the shared focus ring (2px out, radius 10, `fast`), no ring after a click, check draw 80 ms in / 40 ms out and no draw at mount (`icon.tsx:98-170`), dark-mode tokens.

## Merge and split of the selected background

- **Cause:** `not ported yet`. `motion` animates per-corner radii and per-property transitions (`ghia:docs/fork/motion.md:56`), so nothing stops it.
- **Original:** `useMergeSplitBlocks` (`use-merge-split.tsx:144-340`, used at `checkbox-group.tsx:98`): when one unchecked row bridges two checked runs, the two blocks glide their inner edges to the bridge row's midpoint with the facing corners straightening, then swap to one block with no visible motion. Unchecking a middle row plays it backwards. `SelectionBackgrounds` draws the blocks with per-corner radii (`use-merge-split.tsx:392-452`).
- **Port:** one `FluidHighlight` per run, keyed by a stable run id (`createSelectionRuns`, `choice-group.tsx:63-108`; render in `ChoiceGroup`). Checking a bridge row makes the upper run spring (`moderate`) over the whole union, while the lower run's highlight fades out in place. Unchecking a middle row springs the one block shorter and a new block for the lower run appears at once.
- **Workaround:** run ids survive a change, so a block that grows or shrinks at one end moves in place, as in FF.
- **Fidelity:** approximated (growing, shrinking and moving runs match; merge and split lose the meeting-in-the-middle choreography).
- **Components it hits:** just this one (radio-group has a single run). `base-ui:BASE-UI-AUDIT.md` lists merge/split as out of scope only for combobox.

## A surrounding `SizeProvider` is not read

- **Cause:** `not ported yet`.
- **Original:** `size` on the group pins every row through a `SizeProvider`; omitted, the group follows the surrounding provider (`checkbox-group.tsx:64-67,212-213`). Items take no `size`.
- **Port:** `size` on the group is the only way to choose compact for that group; omitted, it follows the Size row (`sizeChoice()`, `choice-group.tsx:188`). The rows and the square both read it (`choice-group.tsx` `ChoiceRow` hands it to the indicator). No surrounding size provider is read.
- **Workaround:** pass `size` to the group.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size`.

## Props: `className`, `ref`, HTML attributes

- **Cause:** `not ported yet`.
- **Original:** both components forward `ref`, `className` and the rest of the `div` props (`checkbox-group.tsx:59-70,219-227`); the sizes page narrows the group to `w-44`, the bento preview to 220 px.
- **Port:** a fixed `width: 288, maxWidth: "100%"` (`choice-group.tsx:201-202`); `testId` is the only pass-through.
- **Workaround:** none.
- **Fidelity:** dropped (cannot restyle).
- **Components it hits:** radio-group.

## Demo variants

- **Cause:** `port choice` (extras are port additions); the sizes-page variant is `not ported yet`.
- **Original:** the docs page has one example, Basic: Apples, Bananas, Cherries, Dates, Apples checked (`app/docs/checkbox-group/page.tsx:56-77`). Other pages use it with nothing checked at 220 px (`app/components/bento-previews.tsx:288-309`) and as a two-row group inside a compact `SizeProvider` at `w-44` (`app/docs/sizes/page.tsx:498-515`).
- **Port:** Default (Apples checked, plus a "Checked: ..." readout), Compact (Bananas and Cherries checked) and "Narrow, empty" (the bento preview's five rows, nothing checked, in a 220 px wrapper the group's `maxWidth: 100%` shrinks to) (`src/demos/checkbox-group.tsx`). Missing: the `w-44` two-row group of the sizes page (an explicit `size` scopes no children, see "`size` is read twice").
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
