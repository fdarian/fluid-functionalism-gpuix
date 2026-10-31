/**
 * Site nav: the New dots follow the latest release (and the Changelog row has
 * its own), the Changelog page sits under Introduction in the nav, the page
 * order and the site menu, and the hover highlight follows the pointer and
 * keyboard focus, never sitting on a row the pointer is not over once focus
 * has left the menu.
 *
 *   bun scripts/check-site-nav.tsx
 *
 * Prints PASS / FAIL lines; exits 1 on any FAIL.
 */

import { createTestRoot } from '@ghia/solid/testing';
import { App } from '#/app';
import { marks } from '#/lib/changelog/releases';
import { loadDemos, loadPages } from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { pageOrder } from '#/lib/page-nav';
import { setThemeChoice } from '#/lib/theme';
import { readPng } from './png-pixels';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;
let failed = false;

async function settle(ms = 400) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
function check(name: string, ok: boolean, detail = '') {
	console.log(
		`${ok ? 'PASS' : 'FAIL'} ${name}${detail === '' ? '' : ` (${detail})`}`,
	);
	if (!ok) failed = true;
}
function element(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function bounds(testId: string) {
	const box = renderer.getElementBounds(element(testId).id);
	if (box === null) throw new Error(`no bounds ${testId}`);
	return box;
}
function center(testId: string) {
	const box = bounds(testId);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function click(testId: string) {
	const point = center(testId);
	renderer.nativeSimulateMouseMove(point.x, point.y);
	await settle(100);
	renderer.nativeSimulateClick(point.x, point.y);
	await settle(600);
}

const SHOT = `/tmp/check-site-nav-${process.pid}.png`;
const UNLIT = 23;
/** The row's fill beside its label: the sidebar's own background when nothing is drawn behind the row. */
function fillOf(testId: string) {
	renderer.captureScreenshot(SHOT);
	const box = bounds(testId);
	return readPng(SHOT).at(
		Math.round(box.x + 3),
		Math.round(box.y + box.height / 2),
	)[0];
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice('dark');
test.render(() => <App demos={demos} pages={pages} initialPage="showcase" />);
await settle(800);

// New dots: the latest release's New entries, plus the Changelog row's own; pages listed ahead of the release get none.
const dotOf = (testId: string) =>
	element(testId)
		.children.map((child) => renderer.getElement(child))
		.find((child) => child?.customProps?.['aria-label'] === 'New');
const listed = [...pages, ...demos].filter(
	(entry) => entry.listed === 'sidebar',
);
const dotted = listed
	.filter((entry) => dotOf(`nav-${entry.slug}`) !== undefined)
	.map((entry) => entry.slug)
	.sort();
const expectedDots = [
	'changelog',
	...marks.new.filter((slug) => listed.some((entry) => entry.slug === slug)),
].sort();
check(
	"the New dots are the latest release's New entries and Changelog",
	dotted.join() === expectedDots.join(),
	dotted.join(),
);
check(
	'pages listed ahead of the release have no dot',
	marks.ahead.length > 0 && marks.ahead.every((slug) => !dotted.includes(slug)),
);
const dot = dotOf('nav-changelog');
check(
	"a dot is 6px, in the info colour, after the label at the row's 8px gap",
	dot !== undefined &&
		dot.style.width === 6 &&
		dot.style.height === 6 &&
		dot.style.backgroundColor === '#93C5FD',
);
if (dot !== undefined) {
	const label = bounds('nav-changelog-label');
	const box = renderer.getElementBounds(dot.id);
	check(
		'the dot sits one 8px gap after the label',
		box !== null && Math.abs(box.x - (label.x + label.width + 8)) < 1,
		`${box?.x} vs ${label.x + label.width}`,
	);
}

// Changelog sits under Introduction, in the nav and in the page order.
check(
	'the page order runs Showcase, Introduction, Changelog, then System',
	pageOrder(pages, demos).slice(0, 3).join() ===
		'showcase,introduction,changelog',
	pageOrder(pages, demos).slice(0, 4).join(),
);
check(
	'the Changelog row is the third row, under Introduction',
	bounds('nav-showcase').y < bounds('nav-introduction').y &&
		bounds('nav-introduction').y < bounds('nav-changelog').y &&
		bounds('nav-changelog').y < bounds('nav-fluid-hover').y,
);

// Focus leaving the menu takes the highlight with it, as the source's onBlur does.
await click('nav-sizes');
const lit = fillOf('nav-sizes');
check('the clicked row is lit', lit > UNLIT, String(lit));
renderer.focusElement(element('nav-search').id);
await settle(400);
const active = fillOf('nav-sizes');
check(
	'the row keeps only the active fill once focus has left the menu',
	active > UNLIT && active < lit,
	`${lit} -> ${active}`,
);

// A scroll moves rows under a stationary pointer: the highlight follows.
const probe = center('nav-skill');
renderer.nativeSimulateMouseMove(probe.x, probe.y);
await settle(300);
check("the pointer's row is lit", fillOf('nav-skill') > UNLIT);
renderer.nativeSimulateScrollWheel(probe.x, probe.y, 0, 64);
await settle(600);
const navRows = [...pages, ...demos]
	.filter((entry) => entry.listed === 'sidebar')
	.map((entry) => `nav-${entry.slug}`);
const rowsUnderPointer = navRows.filter((id) => {
	const box = bounds(id);
	return box.y <= probe.y && probe.y < box.y + box.height;
});
const under = rowsUnderPointer[0];
if (under === undefined) throw new Error('no row under the pointer');
check(
	'after a wheel scroll the row now under the pointer is lit',
	fillOf(under) > UNLIT && under !== 'nav-skill',
	under,
);
check('the row that left the pointer is not', fillOf('nav-skill') === UNLIT);

// A prose link follows its href: Sizes' "Typography" shows the Typography page.
renderer.clickElement(element('sizes-typography-link').id);
await settle(600);
check(
	"the Sizes page's Typography link shows the Typography page",
	renderer.getAllText().some((line) => line.includes('Markdown gets the same')),
);

// A page switch lands at the top, as every navigation of the source does: the scroller's offset is not carried across (and clamped by) the next page's height.
await click('nav-changelog');
const scroller = element('page-scroller');
// [scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight]; the call draws what is pending first.
const metrics = () => {
	const found = renderer.getScrollMetrics?.(scroller.id);
	if (found === undefined || found === null)
		throw new Error('no scroll metrics for the page scroller');
	return found;
};
renderer.nativeSimulateScrollWheel(800, 400, 0, 6000);
await settle(800);
const scrolledTo = metrics()[1];
check(
	'the Changelog scrolls down before the switch',
	scrolledTo > 1000,
	String(scrolledTo),
);
const target = center('nav-fluid-hover');
renderer.nativeSimulateMouseMove(target.x, target.y);
await settle(100);
renderer.nativeSimulateClick(target.x, target.y);
// The first read draws what is pending: the new page's first frame.
const firstFrameTop = metrics()[1];
check(
	"the new page's first frame is at the top",
	firstFrameTop === 0 && metrics()[3] > metrics()[5],
	`${scrolledTo} -> ${firstFrameTop}, scrollHeight ${metrics()[3]}`,
);
await settle(600);
check(
	'the new page stays at the top',
	metrics()[1] === 0,
	String(metrics()[1]),
);

// Switching back lands at the top as well: the Changelog does not return to where it was left, and the page left half-way does not carry its offset either.
renderer.nativeSimulateScrollWheel(800, 400, 0, 300);
await settle(600);
const leftAt = metrics()[1];
check(
	'the page switched to scrolls down before the switch back',
	leftAt > 0,
	String(leftAt),
);
await click('nav-changelog');
await settle(600);
check(
	'switching back to the Changelog lands at the top',
	metrics()[1] === 0 && metrics()[3] > metrics()[5],
	`${scrolledTo} -> ${metrics()[1]}, scrollHeight ${metrics()[3]}`,
);

// The site menu finds Changelog by its keywords.
renderer.simulateKeystrokes('ControlOrMeta+k');
await settle(600);
renderer.simulateKeystrokes("w h a t ' s");
await settle(600);
check(
	'the site menu lists Changelog for "what\'s"',
	renderer.getAllText().includes('Open Changelog'),
);

test.unmount();
process.exit(failed ? 1 : 0);
