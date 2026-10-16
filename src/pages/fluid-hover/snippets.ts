export const FLUID_HOVER_CODE = `import { useRef } from "react";
import { useFluidHover, useRegisterFluidHoverItem } from "@/hooks/use-fluid-hover";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";

// One list, one highlight. The hook picks the row whose center is nearest
// the cursor; the highlight springs to that row's rect on spring.fast.
function List({ rows }: { rows: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(containerRef);

  return (
    <div ref={containerRef} className="relative flex flex-col p-2" {...hover.handlers}>
      {/* The highlight reads the hook: it sits on the nearest row and fades
          in fresh on every entry instead of sliding over from its last spot. */}
      <FluidHoverHighlight hover={hover} className="rounded-lg" />
      {rows.map((label, i) => (
        <Row key={label} index={i} registerItem={hover.registerItem} onClick={() => open(label)}>
          {label}
        </Row>
      ))}
    </div>
  );
}

// Rows are real buttons: focusable, activatable from the keyboard, announced
// by their label. The hook only lights them; it never moves focus.
function Row({ index, registerItem, onClick, children }) {
  const ref = useRef<HTMLButtonElement>(null);
  useRegisterFluidHoverItem(registerItem, index, ref);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="relative z-10 flex h-9 w-full items-center px-3 text-left outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
    >
      {children}
    </button>
  );
}`;

export const MATH_CODE = `// Per mouse move (coalesced to one animation frame), for every row:
const center = rect.top + rect.height / 2;
const distance = Math.abs(cursorY - center);
if (distance < closestDistance) {
  closestDistance = distance;
  nearest = index;
}

// A row the cursor is inside always wins. Otherwise the nearest center does,
// so the cursor in a gap, in the padding, or past the last row still lands.
setActiveIndex(containing ?? nearest);`;

export const AXES_CODE = `import { useFluidHover } from "@/hooks/use-fluid-hover";

// "y" (default): lists. Nearest by the vertical center, top + height / 2.
useFluidHover(containerRef);

// "x": strips. Nearest by the horizontal center, left + width / 2.
useFluidHover(containerRef, { axis: "x" });

// "xy": grids. Nearest center by straight-line distance across rows and columns.
useFluidHover(containerRef, { axis: "xy" });`;

export const COST_CODE = `import { useFluidHover, pickNearest } from "@/hooks/use-fluid-hover";

// The hook runs pickNearest once per animation frame: one loop over the
// cached row rects, no DOM reads per row. The meter times that same
// function on every move, with the same inputs.
const t0 = performance.now();
pickNearest({
  axis: "y",
  point: { x: e.clientX, y: e.clientY },
  rects: itemRects,
  containerRect: container.getBoundingClientRect(),
  scroll: { x: container.scrollLeft, y: container.scrollTop },
  border: { x: container.clientLeft, y: container.clientTop },
  layoutSize: { width: container.offsetWidth, height: container.offsetHeight },
});
const workPerMove = performance.now() - t0;

// The highlight is 1 element that travels on a transform: while it moves,
// its top / left / width / height are never written.`;

export const LISTS_CODE = `<SidebarGroup>
  <SidebarGroupLabel>Workspace</SidebarGroupLabel>
  <SidebarMenu>                     {/* list 1 */}
    <SidebarMenuItem>
      <SidebarMenuButton icon={MessageCircle} aria-expanded={open} onClick={toggle}>
        Chat
        <Chevron open={open} />           {/* turns 90° while open */}
      </SidebarMenuButton>
      <SidebarMenuSub open={open}>  {/* children stay in list 1 */}
        <SidebarMenuSubItem><SidebarMenuSubButton href="#">Today</SidebarMenuSubButton></SidebarMenuSubItem>
        <SidebarMenuSubItem><SidebarMenuSubButton href="#">Yesterday</SidebarMenuSubButton></SidebarMenuSubItem>
      </SidebarMenuSub>
    </SidebarMenuItem>
    <SidebarMenuItem><SidebarMenuButton icon={Brain}>Agents</SidebarMenuButton></SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton icon={SquareLibrary} disabled>Knowledge</SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem><SidebarMenuButton icon={Play}>Runs</SidebarMenuButton></SidebarMenuItem>
  </SidebarMenu>
</SidebarGroup>

<SidebarSeparator />                {/* a different kind of thing follows */}

<SidebarGroup>
  <SidebarGroupLabel>Account</SidebarGroupLabel>
  <SidebarMenu>                     {/* list 2 */}
    <SidebarMenuItem><SidebarMenuButton icon={User}>Profile</SidebarMenuButton></SidebarMenuItem>
    <SidebarMenuItem><SidebarMenuButton icon={ArrowLeft}>Log out</SidebarMenuButton></SidebarMenuItem>
  </SidebarMenu>
</SidebarGroup>`;
