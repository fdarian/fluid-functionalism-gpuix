/**
 * Sidebar overlay motion: a changed row springs, the same row moving snaps.
 *
 *   bun scripts/check-sidebar-motion.tsx
 *
 * A menu has a parent row, a sub-menu and a row below it. The shared focus ring
 * sits on the last row while the sub-menu opens from outside the menu: the row
 * moves every frame, and the ring must stay on it. Moving the ring to another
 * row must glide.
 */
import { createSignal } from "solid-js";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuSub,
} from "#/components/sidebar";
import { createCheck } from "./check-kit";

const [open, setOpen] = createSignal(false);
const kit = await createCheck(() => (
	<div style={{ width: 256, padding: 8 }}>
		<SidebarMenu testId="menu">
			<SidebarMenuButton testId="parent" label="Button" />
			<SidebarMenuSub open={open()}>
				<SidebarMenuButton
					testId="sub-1"
					level={1}
					label="Variants"
					disabled={() => !open()}
				/>
				<SidebarMenuButton
					testId="sub-2"
					level={1}
					label="Sizes"
					disabled={() => !open()}
				/>
			</SidebarMenuSub>
			<SidebarMenuButton testId="last" label="Banner" />
		</SidebarMenu>
	</div>
));
const renderer = kit.renderer;

/**
 * Runs `trigger` with the motion clock held, then samples a row and the ring on each 8 ms frame. A snapping ring is re-measured one
 * frame after its row moves, so it sits on the row's previous position; `behind`
 * is how far the ring falls short of that, `lag` its distance from the row now.
 */
function sample(testId: string, frames: number, trigger: () => void) {
	let behind = 0;
	let lag = 0;
	let travel = 0;
	const start = kit.bounds(testId).y;
	let previous = start;
	renderer.clockPause();
	trigger();
	for (let frame = 0; frame < frames; frame++) {
		kit.step(frame === 0 ? 0 : 8);
		const row = kit.bounds(testId).y;
		const ring = kit.bounds("menu-focus-ring").y + 2;
		travel = Math.max(travel, Math.abs(row - start));
		if (frame > 0) {
			behind = Math.max(behind, (previous - ring) * Math.sign(row - start));
			lag = Math.max(lag, Math.abs(ring - row));
		}
		previous = row;
	}
	renderer.clockResume();
	return { behind, lag, travel };
}

renderer.simulateKeystrokes("Tab");
await kit.settle(200);
renderer.simulateKeystrokes("End");
await kit.settle(300);
kit.check(
	"the last row has the focus",
	renderer.getFocusedElementId() === kit.element("last").id,
);

const parentBottom = kit.bounds("parent").y + kit.bounds("parent").height;
const opening = sample("last", 40, () => setOpen(true));
kit.check(
	"the row moved under the ring",
	opening.travel > 20,
	`travelled ${opening.travel.toFixed(1)}px`,
);
kit.check(
	"a ring on a row that only moves stays on it",
	opening.behind < 1.5,
	`behind the row by ${opening.behind.toFixed(2)}px at most`,
);
await kit.settle(300);
kit.expect(
	"the open sub-menu has its natural height",
	kit.bounds("last").y - parentBottom,
	56,
);

const moving = sample("sub-2", 12, () => renderer.simulateKeystrokes("ArrowUp"));
kit.check(
	"a ring that changes row glides to it",
	moving.lag > 0.5,
	`max lag ${moving.lag.toFixed(2)}px`,
);
await kit.settle(300);
kit.check(
	"the ring settles on the new row",
	Math.abs(kit.bounds("menu-focus-ring").y + 2 - kit.bounds("sub-2").y) < 0.5,
);

kit.finish();
