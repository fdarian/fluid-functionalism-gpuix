import { createSignal } from "solid-js";
import { Button } from "#/components/button";
import { Select } from "#/components/select";
import { createCheck } from "./check-kit";
const k = await createCheck(() => (
	<div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
		<Select testId="s" variant="bordered" items={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} placeholder="Pick" />
		<Button testId="after">After</Button>
	</div>
), { width: 800, height: 600, initialSettleMs: 400 });
const r = k.renderer;
const who = () => { const f = r.getFocusedElementId(); for (const id of ["s-trigger", "s-list", "s-option-a", "s-option-b", "after"]) { const e = r.findByTestId(id); if (e && e.id === f) return id; } return f; };
for (const [label, x, y] of [["bare", 700, 500], ["after button", -1, -1]] as const) {
	const c = k.center("s-trigger");
	r.nativeSimulateClick(c.x, c.y); await k.settle(400);
	console.log(label, "after pointer open: open?", k.exists("s-list"), "focus", who());
	const p = x < 0 ? k.center("after") : { x, y };
	r.nativeSimulateClick(p.x, p.y); await k.settle(400);
	console.log(label, "after outside click: open?", k.exists("s-list"), "focus", who());
}
process.exit(0);
