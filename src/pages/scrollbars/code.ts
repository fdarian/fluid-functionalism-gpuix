/** The source's snippets, verbatim: they show Tailwind classes and `viewportClassName`, where the port's `ScrollArea` takes `fade` and a `style`. */
export const PROBLEM_CODE = `// ❌ Native overflow. On macOS the scrollbar is hidden until
// you happen to scroll, so the list looks like it just stops —
// and when it does show, it's the OS default.
<div className="h-56 w-64 overflow-y-auto border border-border">
  <div className="flex flex-col p-3">
    {releases.map((r) => (
      <div key={r} className="px-3 py-2 text-body text-foreground whitespace-nowrap">
        {r}
      </div>
    ))}
  </div>
</div>

// ✅ ScrollArea. A scrollbar that stays discoverable on hover,
// plus a shadcn scroll-fade on the viewport so the edge dissolves
// when there's more below.
<ScrollArea
  viewportClassName="scroll-fade"
  className="h-56 w-64 border border-border"
>
  <div className="flex flex-col p-3">
    {releases.map((r) => (
      <div key={r} className="px-3 py-2 text-body text-foreground whitespace-nowrap">
        {r}
      </div>
    ))}
  </div>
</ScrollArea>`;

export const HORIZONTAL_CODE = `import { ScrollArea } from "./components";

// scroll-fade-x fades the left/right edges instead.
<ScrollArea
  orientation="horizontal"
  viewportClassName="scroll-fade-x"
  className="w-full"
>
  <div className="flex gap-2 p-3 w-max">
    {months.map((month) => (
      <div
        key={month}
        className="flex items-center justify-center h-20 w-28 shrink-0 border border-border text-body text-foreground"
      >
        {month}
      </div>
    ))}
  </div>
</ScrollArea>`;

export const FADE_CODE = `/* globals.css — vendored from shadcn's scroll-fade utility.
   A mask dissolves the content toward the edges with more to
   scroll; a scroll-driven animation (elided here — see the full
   utility in globals.css) keeps the true start/end edge crisp. */
.scroll-fade {
  --scroll-fade-size: 48px;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--scroll-fade-size),
    #000 calc(100% - var(--scroll-fade-size)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--scroll-fade-size),
    #000 calc(100% - var(--scroll-fade-size)),
    transparent 100%
  );
}

/* Apply it to any scroll container, or to a ScrollArea viewport. */
<ScrollArea
  viewportClassName="scroll-fade"
  className="h-64 w-72 border border-border"
>
  <div className="flex flex-col p-3">
    {releases.map((r) => (
      <div key={r} className="px-3 py-2 text-body text-foreground whitespace-nowrap">
        {r}
      </div>
    ))}
  </div>
</ScrollArea>`;

export const TABLE_CODE = `import { ScrollArea } from "./components";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./components";

// orientation="both" adds both scrollbars and the corner. w-max
// lets the table grow past the viewport instead of squeezing in.
<ScrollArea orientation="both" className="h-80 w-full">
  <Table className="w-max">
    <TableHeader>
      <TableRow>
        <TableHead className="whitespace-nowrap">City</TableHead>
        {months.map((m) => (
          <TableHead key={m} className="text-right whitespace-nowrap">
            {m}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {cities.map((city, r) => (
        <TableRow key={city} index={r}>
          <TableCell className="text-foreground whitespace-nowrap">
            {city}
          </TableCell>
          {months.map((m, c) => (
            <TableCell
              key={m}
              className="text-right tabular-nums whitespace-nowrap"
            >
              {metric(r, c)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</ScrollArea>`;
