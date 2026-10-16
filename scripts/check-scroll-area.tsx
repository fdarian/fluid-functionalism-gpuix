/**
 * ScrollArea scenarios: keys typed into a focused input inside the area stay
 * with the input (Space types, arrows do not scroll), while the same keys on
 * the focused viewport itself still scroll it.
 *
 *   bun scripts/check-scroll-area.tsx
 */
import { createSignal, For } from "solid-js";
import { ScrollArea } from "../src/components/scroll-area";
import { createCheck } from "./check-kit";

const [text, setText] = createSignal("");
const [listKeys, setListKeys] = createSignal(0);

const check = createCheck(() => (
	<div style={{ padding: 20 }}>
		<ScrollArea testId="area" width={300} height={160}>
			<div style={{ display: "flex", flexDirection: "column", padding: 8 }}>
				<input
					testId="field"
					aria-label="Field"
					value={text()}
					style={{ height: 24, width: 200 }}
					onChange={(event) => {
						if (event.value === undefined) throw new Error("no value");
						setText(event.value);
					}}
				/>
				<div
					testId="own-handler"
					tabIndex={0}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setListKeys(listKeys() + 1);
						}
					}}
					style={{ height: 24, width: 200 }}
				>
					<text>Handles arrows itself</text>
				</div>
				<For each={Array.from({ length: 30 }, (_, index) => index)}>
					{(index) => (
						<text testId={`row-${index}`} style={{ height: 20 }}>
							{`Row ${index}`}
						</text>
					)}
				</For>
			</div>
		</ScrollArea>
	</div>
));

await check.settle();

const top = () => check.bounds("row-0").y;
const start = top();

// Positive control: the focused viewport itself still scrolls with the keys.
await check.click("row-3");
await check.press("down");
check.expect("ArrowDown on the focused viewport scrolls 40px", top(), start - 40);
await check.press("home");
check.expect("Home on the focused viewport scrolls back", top(), start);

await check.focus("field");
await check.press("a space b");
check.expect("Space and letters type into the input", text(), "a b");
check.expect("Space in the input does not scroll the area", top(), start);

await check.press("down down pagedown");
check.expect(
	"arrows and PageDown in the input do not scroll the area",
	top(),
	start,
);

await check.press("end");
check.expect("End in the input does not scroll the area", top(), start);

await check.focus("own-handler");
await check.press("down");
check.expect("a child's own ArrowDown handler runs", listKeys(), 1);
check.expect(
	"a child that handles ArrowDown does not also scroll the area",
	top(),
	start,
);

check.finish();
