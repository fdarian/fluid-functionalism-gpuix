/**
 * Slider scenarios on the slider demo.
 *
 *   bun scripts/check-slider.tsx
 */
import { showOnly } from "../src/demos/slider";
import { createCheck } from "./check-kit";

const kit = await createCheck("slider");
const renderer = kit.renderer;
showOnly("display");
await kit.settle(400);

// Click-to-edit selects the number, so typing replaces it.
const valueId = "left-value-0";
const point = kit.center(valueId);
renderer.nativeSimulateClick(point.x, point.y);
await kit.settle(600);
kit.check("clicking the value opens the field", kit.exists("left-edit-0"));
const field = kit.element("left-edit-0");
const selection = renderer.getTextSelection(field.id);
kit.check(
	"the field selects the existing text",
	selection.start === 0 && selection.end === 2,
	`${selection.start}..${selection.end}`,
);
renderer.simulateKeystrokes("7 2");
await kit.settle(300);
renderer.simulateKeystrokes("enter");
await kit.settle(500);
kit.check(
	"typing replaces the number",
	renderer.getAllText().some((line) => line.includes("72")),
);

kit.finish();
