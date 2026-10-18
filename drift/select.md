# select

Original: `registry/base/select.tsx` (shared: `registry/default/lib/popup.ts`, `hooks/use-keyboard-nav-gate.ts`, `fluid-hover-highlight.tsx`, `lib/size-context.tsx`), demo in `app/docs/select/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/select.tsx`, demo in `src/demos/select.tsx`.
Popup chrome is shared: `src/lib/popup.tsx`, `src/lib/presence.ts`, `src/lib/list-nav.ts`.

## Popup `scaleY: 0.96` entrance

- **Cause:** `gpuix gap`.
- **Original:** enters with `opacity 0, y -4, scaleY 0.96` to rest, `spring.fast`; exits on `spring.fast.exit` (`select.tsx:470-478`, `popup.ts:16-23`).
- **Port:** opacity plus a 4px slide on `top`, no scale (`popup.tsx:63-71`).
- **gpuix lacks:** CSS transforms; see README "Missing features", CSS transforms row.
- **Workaround:** the slide.
- **Fidelity:** approximated.
- **Components it hits:** dropdown, combobox, color-picker, tooltip, dialog.

## Highlights travel on `top` / `left`, not a transform

- **Cause:** `gpuix gap`.
- **Original:** the hover pill is pinned at 0,0 and moved with `x` / `y` transforms, so travel stays on the compositor (`fluid-hover-highlight.tsx:121-131`).
- **Port:** the pill animates `top` / `left` / `width` / `height`, which re-lays out per frame (`fluid-highlight.tsx:81-88`).
- **gpuix lacks:** transforms (README, CSS transforms row; translation table "translate / x,y travel").
- **Workaround:** none needed visually.
- **Fidelity:** approximated (same path, different cost).
- **Components it hits:** every fluid hover list.

## Form value is a real, invisible input

- **Cause:** `gpuix gap`.
- **Original:** Base UI renders a hidden input, so `name` and `required` work in a `<form>` (`select.tsx:211-213`).
- **Port:** `FormValue` mounts only when `name` or `required` is set (`select.tsx:576-584`).
- **gpuix lacks:** `<input type="hidden">` (README, Missing features, `FormValue` row).
- **Workaround:** `FormValue` is an invisible, unreachable input; an empty required one hands focus to the trigger.
- **Fidelity:** exact.
- **Components it hits:** combobox, color-picker.

## Implicit submission needs a lone input

- **Cause:** `gpuix gap`.
- **Original:** Enter in a form control submits and an empty `required` select blocks it and takes focus.
- **Port:** only `form.requestSubmit()` validates; the demo calls it from the Submit button (`demos/select.tsx:286`).
- **gpuix lacks:** a submit button (`SubmitEvent.submitter` is always `null`), so a form with two or more `<input>`s does not submit on Enter (gpuix `README.md:3602-3609`): the demo's form holds the Name input and the Select's `FormValue` input. Enter in a lone empty `required` `<input>` does validate now (README Bugs row "select, combobox"; `drift/combobox.md`).
- **Workaround:** `requestSubmit()`.
- **Fidelity:** exact for `requestSubmit()`, dropped for implicit submission.
- **Components it hits:** combobox.

## Releasing the press outside the popup does not cancel

- **Cause:** `not ported yet`.
- **Original:** press the trigger, drag, release outside both trigger and popup: Base UI cancels (`SelectItem.tsx:194-236`, `SelectTrigger.tsx:27-129`, per `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:539`).
- **Port:** rows judge the release (`select.tsx:339-347`); a release elsewhere leaves the popup open.
- **gpuix lacks:** n/a: a `window` listener hears every `mouseup`, whatever it lands on (`FORK.md:397-398`), so the cancel can be built; the port has not adopted one (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md:539`).
- **Workaround:** none; the press-and-drag commit itself is ported (400 ms or 8px, `select.tsx:35-38`).
- **Fidelity:** dropped (the cancel).
- **Components it hits:** just this one.

## Group labels are not a group

- **Cause:** `not ported yet`.
- **Original:** `SelectGroup` renders `role="group"` around its label and rows (`select.tsx:768-778`).
- **Port:** labels and separators are flat entries in the same list; no group element or role (`select.tsx:434-463`).
- **Workaround:** none.
- **Fidelity:** approximated (looks the same; the a11y tree has no group).
- **Components it hits:** just this one.

## Compact group label keeps the default size

- **Cause:** `not ported yet`.
- **Original:** `typeClass("caption", compact ? "compact" : "default")`, so 11/14 in compact with `py-1.5` (`select.tsx:785-792`, `type-scale.ts` caption).
- **Port:** a fixed 28px row and `scale.caption` (12/16) at every size (`select.tsx:97`, `:436-448`).
- **Workaround:** none.
- **Fidelity:** approximated (compact label is 2px taller and 1px larger text).
- **Components it hits:** just this one.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the select in a `SizeProvider` and `SelectTrigger` takes its own `size`, so trigger and popup follow together (`registry/base/select.tsx:99-102`, `:223`, `:278-281`).
- **Port:** `size?: "default" | "compact"` on `Select` only; omitted, it follows the Size row (`src/components/select.tsx:95`, `:113`).
- **Workaround:** pass `size` to each nested component. `CommandMenuFilters` in the source wraps its children in `SizeProvider size="compact"` and forces `w-auto min-w-0` on every `[role=combobox]` (`command-menu.tsx:996-1021`); the port has neither, so each filter select passes `size="compact"` and `hug` (the `w-auto min-w-0`) itself.
- **Fidelity:** approximated.
- **Components it hits:** every component that reads `useSize`.

## Data-driven API and `null` for no value

- **Cause:** `port choice` (data-driven `items`, not compound, per `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:497`; reason otherwise not stated).
- **Original:** compound `Select` / `SelectTrigger` / `SelectContent` / `SelectItem index` / `SelectGroup` / `SelectLabel` / `SelectSeparator`; `variant`, `icon`, `placeholder`, `error`, `size` on the trigger; value is a string, `""` for none; `className` and `ref` forwarded (`select.tsx:91-103`, `:254-263`, `:625-630`).
- **Port:** one `Select` taking `items` (items, `{ type: "label" }`, `{ type: "separator" }`), `variant`, `size`, `placeholder`, `icon`, `error`, `labelledBy`, `label` (the trigger's `aria-label`; the source passes it to `SelectTrigger` as a prop), `hug` (the trigger is as wide as its content, the source's `w-auto min-w-0` on the command menu's filters, which pass it as a `className`); value is `Value | null`; no `className` or `ref` (`select.tsx:111-135`).
- **Workaround:** none.
- **Fidelity:** approximated (API shape; row `index` is computed, not passed).
- **Components it hits:** combobox, dropdown.

## Default variant is `inline`, a port-only variant

- **Cause:** `port choice` (serves the app frame's theme picker, `app.tsx:220`, and the site's "Make them yours" card; docstring at `select.tsx:54-58`).
- **Original:** `variant` is `"bordered"` (default) or `"borderless"` (`select.tsx:241-249`).
- **Port:** `variant` defaults to `"inline"` (`select.tsx:136`): borderless, compact trigger, 13px text, shows the picked item's icon, popup right-aligned and content-sized like the others (`select.tsx:137-148`, `:396`). Every demo passes `bordered` explicitly.
- **Workaround:** none.
- **Fidelity:** exact for `bordered` and `borderless` (an `error` draws the destructive border on both, as the source does).
- **Components it hits:** just this one.

## The port adds a pressed background on the trigger

- **Cause:** `port choice` (reason not stated).
- **Original:** only `hover:bg-hover`; no pressed style (`select.tsx:243-246`).
- **Port:** `active: { backgroundColor: color.active }` (`src/components/select.tsx:325`).
- **Workaround:** none.
- **Fidelity:** approximated (extra state; the popup opens on mouse-down, so it shows briefly).
- **Components it hits:** just this one.

## The list scrolls in a bare scroller

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Popup list scrolls in plain `overflow`, not ScrollArea"](dropdown.md#popup-list-scrolls-in-plain-overflow-not-scrollarea), where the entry lives. Here: original `select.tsx:538`; port `select.tsx:599-606` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md:534`: gpuix has `scrollbarWidth: "none"`, `onScroll` offsets and `maskImage`).

## Clicks between rows are not routed to the lit row

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Clicks in the padding and between rows are not routed to the lit row"](dropdown.md#clicks-in-the-padding-and-between-rows-are-not-routed-to-the-lit-row), where the entry lives. Here: original `select.tsx:505`; port `Row` handles its own click (`select.tsx:690`).

## The selected background fades in on every open

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Checked background appears with a fade instead of already being there"](dropdown.md#checked-background-appears-with-a-fade-instead-of-already-being-there), where the entry lives. Here: original `select.tsx:551-578`; port `select.tsx:618-625`. (Was recorded as `port choice`; the blocker is the shared `FluidHighlight`, which `motion`'s `initial={false}` could serve.)

## Demo: variants, copy and page shape

- **Cause:** `port choice` (reason not stated) for the copy and counts; `not ported yet` for the code snippets and API tables.
- **Original:** sections Basic, Variants (bordered + borderless, 3 fruits), With Icons, Groups, Scrollable List, Error State, Disabled; each has a code snippet, and the page ends with four props tables (`page.tsx:278-428`).
- **Port:** the same seven, as rows in cards (`demos/select.tsx:110-239`), plus three the source lacks: Compact, Uncontrolled (keyboard, typeahead and `defaultValue` selects), and a Form card with a required select. Differences: Variants and Basic use four fruits (Apple, Banana, Cherry, Mango) where the source's Variants has three (`:16-20`, `:122-137`); the disabled select holds Admin / Editor / Viewer, the source's one "Option A" (`:197-206`); "Some disabled" lists "Also available" where the source repeats "Available" (`:65-69`); Basic sets `variant="bordered"` explicitly. No code snippets, no props tables, no page description.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every demo page shares the card layout and lacks the snippets.
