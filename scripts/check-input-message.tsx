/**
 * Input message checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-input-message.tsx
 *
 * The composers are mounted on their own: a with an attachment and a queued
 * row, b compact with a queued row, c disabled.
 *
 * - Tab never lands on the disabled composer's textarea.
 * - A tab stop on the tile's remove badge and on the queued row's close button is painted
 *   (opacity 1 all the way up) while it has keyboard focus.
 * - The queued row's close button sits one row padding from the right edge: 10 default, 8 compact.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { fileFromPath, InputMessage } from "../src/components/input-message";
import { TooltipProvider } from "../src/components/tooltip";
import { fonts } from "../src/lib/fonts";
import { color, setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 700, height: 900, fonts });
const renderer = test.renderer;

async function settle(ms: number) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
function element(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function bounds(testId: string) {
	const found = renderer.getElementBounds(element(testId).id);
	if (found === null) throw new Error(`no bounds for ${testId}`);
	return found;
}
/** The opacity a pixel of the element is painted with: the product up the tree. */
function paintedOpacity(testId: string) {
	let opacity = 1;
	let current: ReturnType<typeof renderer.getElement> = element(testId);
	while (current !== undefined) {
		const own = current.style.opacity;
		if (typeof own === "number") opacity *= own;
		current =
			current.parentId === null
				? undefined
				: renderer.getElement(current.parentId);
	}
	return opacity;
}
async function tabTo(testId: string) {
	const target = element(testId).id;
	for (let presses = 0; presses < 40; presses++) {
		renderer.simulateKeystrokes("tab");
		await settle(60);
		if (renderer.getFocusedElementId() === target) {
			await settle(200);
			return;
		}
	}
	throw new Error(`Tab never reached ${testId}`);
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

const assets = new URL("../assets/chat-ai/", import.meta.url).pathname;
const queued = (id: string) => ({ id, text: `Queued ${id}`, files: [] });

setThemeChoice("dark");
test.render(() => (
	<TooltipProvider>
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 20,
				padding: 20,
				width: 560,
				backgroundColor: color.background,
			}}
		>
			<InputMessage
				testId="a"
				value=""
				onValueChange={() => {}}
				files={[fileFromPath(`${assets}micka.png`)]}
				onFilesChange={() => {}}
				status="idle"
				queue={[queued("one")]}
				onQueueChange={() => {}}
			/>
			<InputMessage
				testId="b"
				size="compact"
				value=""
				onValueChange={() => {}}
				status="idle"
				queue={[queued("two")]}
				onQueueChange={() => {}}
			/>
			<InputMessage testId="c" value="" onValueChange={() => {}} disabled />
		</div>
	</TooltipProvider>
));
await settle(1200);

await tabTo("a-file-0-remove");
const badge = paintedOpacity("a-file-0-remove");
report(
	"tile remove badge is painted under keyboard focus",
	badge === 1,
	`opacity ${badge}`,
);
renderer.captureScreenshot("/tmp/check-input-message-badge.png");

await tabTo("a-queued-0-remove");
const close = paintedOpacity("a-queued-0-remove");
report(
	"queued close button is painted under keyboard focus",
	close === 1,
	`opacity ${close}`,
);
renderer.captureScreenshot("/tmp/check-input-message-close.png");

const disabledTextarea = element("c-textarea").id;
const reached = new Set<number>();
for (let presses = 0; presses < 40; presses++) {
	renderer.simulateKeystrokes("tab");
	await settle(40);
	const focused = renderer.getFocusedElementId();
	if (focused !== null) reached.add(focused);
}
report(
	"disabled composer is out of the Tab order",
	!reached.has(disabledTextarea),
	`Tab reached ${reached.size} elements, the textarea ${reached.has(disabledTextarea) ? "among them" : "not among them"}`,
);

for (const [composer, expected] of [
	["a", 10],
	["b", 8],
] as const) {
	const row = bounds(`${composer}-queued-0`);
	const button = bounds(`${composer}-queued-0-remove`);
	const gap = row.x + row.width - (button.x + button.width);
	report(
		`${composer} queued close button is ${expected}px from the row's right edge`,
		gap === expected,
		`${gap}`,
	);
}

// Unmount before exiting: with the tree alive, Bun aborts at exit ("Thread Local Storage", exit 134) after every check passed.
test.root.unmount();
await settle(100);
process.exit(failed ? 1 : 0);
