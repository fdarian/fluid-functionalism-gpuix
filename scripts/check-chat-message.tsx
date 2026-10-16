/**
 * Chat message checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-chat-message.tsx
 *
 * The meta row (timestamp and actions) is revealed by hover and by keyboard focus on an action.
 * The reveal is the opacity target of the row's `animate`; a screenshot with the focused action lands in /tmp/check-chat-message-focus.png.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { ChatMessage, ChatMessageAction } from "../src/components/chat-message";
import { fonts } from "../src/lib/fonts";
import { color, setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 500, height: 200, fonts });
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
/** The opacity the meta row animates to: the grandparent of the time's text. */
function metaOpacity() {
	const text = renderer.findByText("09:41");
	if (text === undefined || text.parentId === null)
		throw new Error("no timestamp");
	const label = renderer.getElement(text.parentId);
	if (label === undefined || label.parentId === null)
		throw new Error("no timestamp label");
	const row = renderer.getElement(label.parentId);
	if (row === undefined) throw new Error("no meta row");
	const motion = row.customProps?.motion as
		| { animate?: { opacity?: number } }
		| undefined;
	if (motion?.animate?.opacity === undefined)
		throw new Error("the meta row has no opacity target");
	return motion.animate.opacity;
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

setThemeChoice("dark");
test.render(() => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			padding: 20,
			width: 460,
			backgroundColor: color.background,
		}}
	>
		<ChatMessage
			testId="message"
			from="user"
			time="09:41"
			actions={
				<>
					<ChatMessageAction testId="copy" action="copy" label="Copy" />
					<ChatMessageAction testId="edit" action="edit" label="Edit" />
				</>
			}
		>
			Hello there
		</ChatMessage>
		<div testId="after" tabIndex={0} style={{ height: 20 }} />
	</div>
));
await settle(800);

const resting = metaOpacity();
report("meta row is hidden at rest", resting === 0, `opacity ${resting}`);

renderer.simulateKeystrokes("tab");
await settle(500);
const focused = renderer.getFocusedElementId();
report(
	"Tab reaches the first action",
	focused === element("copy").id,
	`focused ${focused}, copy ${element("copy").id}`,
);
const focusOpacity = metaOpacity();
report(
	"meta row is shown while an action has keyboard focus",
	focusOpacity === 1,
	`opacity ${focusOpacity}`,
);
renderer.captureScreenshot("/tmp/check-chat-message-focus.png");

renderer.simulateKeystrokes("tab");
await settle(500);
report(
	"meta row stays shown moving between actions",
	metaOpacity() === 1,
	`opacity ${metaOpacity()}`,
);

renderer.simulateKeystrokes("tab");
await settle(500);
const afterFocus = renderer.getFocusedElementId();
report(
	"Tab leaves the message",
	afterFocus === element("after").id,
	`focused ${afterFocus}`,
);
report(
	"meta row hides again when focus leaves",
	metaOpacity() === 0,
	`opacity ${metaOpacity()}`,
);

process.exit(failed ? 1 : 0);
