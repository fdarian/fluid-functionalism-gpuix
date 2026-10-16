import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "#/app";
import { loadDemos, loadPages } from "#/lib/demo";
import { fonts } from "#/lib/fonts";
import { setThemeChoice } from "#/lib/theme";

const demos = await loadDemos();
const pages = await loadPages(demos);
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(ms = 500) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
}

async function click(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) throw new Error(`no ${testId}`);
	const bounds = renderer.getElementBounds(element.id);
	if (bounds === null) throw new Error(`no bounds ${testId}`);
	renderer.nativeSimulateClick(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
	await settle();
}

// The test renderer reports the machine's appearance; pin the scheme so captures are reproducible.
setThemeChoice("dark");
test.render(() => <App demos={demos} pages={pages} />);
await settle();

const first = process.argv[2];
const second = process.argv[3];
await click(`nav-${first}`);
console.log(first, renderer.getAllText().filter((t) => t.length > 0 && !/^(Showcase|Accordion|AskUserQuestions)$/.test(t)).slice(-25).join(" | "));
await click(`nav-${second}`);
console.log(second, renderer.getAllText().filter((t) => t.length > 0 && !/^(Showcase|Accordion|AskUserQuestions)$/.test(t)).slice(-25).join(" | "));
test.unmount();
process.exit(0);
