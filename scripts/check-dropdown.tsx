/**
 * Dropdown scenarios run through the offscreen renderer; prints PASS/FAIL lines.
 *
 *   bun scripts/check-dropdown.tsx
 *
 * Most opens start from the keyboard; "A menu opened with a pointer press"
 * presses the trigger for real.
 */
import { mkdirSync } from 'node:fs';
import { createTestRoot } from '@gpuix/solid/testing';
import { Button } from '#/components/button';
import {
	Dropdown,
	DropdownContent,
	DropdownMenu,
	DropdownSearch,
	DropdownSub,
	DropdownSubContent,
	DropdownSubTrigger,
	DropdownTrigger,
	MenuItem,
} from '#/components/dropdown';
import { fonts } from '#/lib/fonts';
import { createCheck } from './check-kit';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const k = await createCheck('dropdown');
const renderer = k.renderer;

/** The test id of the focused element, among `candidates`; `null` when focus is elsewhere or nowhere. */
function focusedAmong(candidates: readonly string[]) {
	const focused = renderer.getFocusedElementId();
	if (focused === null) return null;
	return (
		candidates.find((testId) => {
			const element = renderer.findByTestId(testId);
			return element !== undefined && element.id === focused;
		}) ?? null
	);
}

// ─── Inline panel ────────────────────────────────────────────────────────────

// A pointer click must not draw the keyboard ring.
await k.scrollIntoView('basic-0');
// The same steps as the `inline-checked` capture of scripts/screenshots.tsx, which
// cannot run past its submenu step in some environments.
const hovered = k.bounds('basic-2');
renderer.nativeSimulateMouseMove(
	hovered.x + 20,
	hovered.y + hovered.height / 2,
);
await k.settle(300);
await k.click('basic-3');
renderer.nativeSimulateMouseMove(700, 80);
await k.settle(300);
mkdirSync(`/tmp/check-dropdown-${process.pid}`, { recursive: true });
renderer.captureScreenshot(
	`/tmp/check-dropdown-${process.pid}/inline-checked.png`,
);
k.check('inline: no ring after clicking a row', !k.exists('basic-ring'));
await k.click('basic-1');
k.check('inline: no ring after a mouse click', !k.exists('basic-ring'));
const next = k.bounds('basic-2');
renderer.nativeSimulateMouseMove(next.x + 20, next.y + next.height / 2);
await k.settle(200);
k.check('inline: no ring after a pointer move', !k.exists('basic-ring'));
await k.press('ArrowDown');
k.check('inline: ring after an arrow key', k.exists('basic-ring'));

// Roving tab stop: Tab from outside lands on the checked row, whichever row had focus
// before. The click above left the second row checked.
const BASIC_ROWS = Array.from(
	{ length: 40 },
	(_, index) => `basic-${index}`,
).filter((testId) => k.exists(testId));
const basicFocus = () => focusedAmong(BASIC_ROWS);
// Shift+Tab from the first row, which is not the tab stop, leaves the panel.
await k.focus('basic-0');
await k.press('Shift+Tab');
k.check(
	'inline: Shift+Tab from the first row leaves the panel',
	basicFocus() === null,
);
for (let presses = 0; presses < 60 && basicFocus() === null; presses++) {
	await k.press('Tab');
}
k.expect('inline: Tab lands on the checked row', basicFocus(), 'basic-1');
k.check(
	'inline: the ring shows on a keyboard-visible focus',
	k.exists('basic-ring'),
);
await k.press('ArrowUp');
k.expect('inline: ArrowUp focuses the previous row', basicFocus(), 'basic-0');
await k.press('ArrowUp');
k.expect(
	'inline: ArrowUp from the first row wraps to the last',
	basicFocus(),
	BASIC_ROWS.at(-1),
);
await k.press('ArrowDown');
k.expect(
	'inline: ArrowDown from the last row wraps to the first',
	basicFocus(),
	'basic-0',
);
await k.press('ArrowRight');
k.expect('inline: ArrowRight is ArrowDown', basicFocus(), 'basic-1');
await k.press('ArrowLeft');
k.expect('inline: ArrowLeft is ArrowUp', basicFocus(), 'basic-0');
await k.press('End');
k.expect('inline: End focuses the last row', basicFocus(), BASIC_ROWS.at(-1));
await k.press('Home');
k.expect('inline: Home focuses the first row', basicFocus(), 'basic-0');
k.check('inline: the ring follows the focus', k.exists('basic-ring'));

// Keyboard entry: Tab into the group draws the ring.
await k.scrollIntoView('groups-0');
for (let presses = 0; presses < 40 && !k.exists('groups-ring'); presses++) {
	await k.press('Tab');
}
k.check('inline: ring after Tab entry', k.exists('groups-ring'));

// ─── Popup menu: keyboard open, focus on the rows ────────────────────────────

const MENU_ROWS = [0, 1, 2, 3, 4].map((index) => `menu-${index}`);
const menuFocus = () =>
	focusedAmong(['menu-trigger', ...MENU_ROWS, 'menu-popup']);
const menuOpen = () => k.exists('menu-0');

await k.scrollIntoView('menu-trigger');
await k.focus('menu-trigger');
await k.press('Enter');
k.expect('menu: Enter opens and focuses the first row', menuFocus(), 'menu-0');
k.check(
	'menu: the focused row is the only tab stop',
	renderer.matchesFocus(k.element('menu-0').id, ':focus'),
);
await k.press('ArrowDown');
k.expect('menu: ArrowDown focuses the next row', menuFocus(), 'menu-1');
await k.press('ArrowUp ArrowUp');
k.expect(
	'menu: ArrowUp from the first row loops to the last',
	menuFocus(),
	'menu-4',
);
await k.press('ArrowDown');
k.expect(
	'menu: ArrowDown from the last row loops to the first',
	menuFocus(),
	'menu-0',
);
await k.press('End');
k.expect('menu: End focuses the last row', menuFocus(), 'menu-4');
await k.press('Home');
k.expect('menu: Home focuses the first row', menuFocus(), 'menu-0');
await k.press('Escape');
k.check('menu: Escape closes', !menuOpen());
k.expect(
	'menu: Escape returns focus to the trigger',
	menuFocus(),
	'menu-trigger',
);

await k.press('ArrowUp');
k.expect(
	'menu: ArrowUp on the trigger opens on the last row',
	menuFocus(),
	'menu-4',
);
await k.press('Escape');

await k.press('Space');
k.expect('menu: Space opens and focuses the first row', menuFocus(), 'menu-0');
await k.press('ArrowDown ArrowDown Enter');
k.check('menu: Enter on a row closes the menu', !menuOpen());
k.expect(
	'menu: a pick returns focus to the trigger',
	menuFocus(),
	'menu-trigger',
);

await k.press('Space');
await k.press('ArrowDown Space');
k.check(
	"menu: Space on a row closes and the key's release does not reopen",
	!menuOpen(),
);
k.expect(
	'menu: Space on a row returns focus to the trigger',
	menuFocus(),
	'menu-trigger',
);

await k.focus('menu-trigger');
await k.press('Tab');
const afterTrigger = renderer.getFocusedElementId();
await k.focus('menu-trigger');
await k.press('Enter');
await k.press('ArrowDown');
await k.press('Tab');
k.check('menu: Tab closes', !menuOpen());
k.check(
	'menu: Tab focuses what follows the trigger',
	afterTrigger !== null && renderer.getFocusedElementId() === afterTrigger,
	`${renderer.getFocusedElementId()} vs ${afterTrigger}`,
);

await k.focus('menu-trigger');
await k.press('ArrowDown');
await k.press('Shift+Tab');
k.check('menu: Shift+Tab closes', !menuOpen());
k.expect('menu: Shift+Tab focuses the trigger', menuFocus(), 'menu-trigger');

// Pointer movement over rows (no press, so it runs in the test renderer).
await k.press('ArrowDown');
const third = k.bounds('menu-2');
renderer.nativeSimulateMouseMove(third.x + 40, third.y + third.height / 2);
await k.settle(300);
k.expect('menu: hovering a row focuses it', menuFocus(), 'menu-2');
renderer.nativeSimulateMouseMove(1200, 40);
await k.settle(300);
k.expect(
	'menu: leaving the rows focuses the popup panel',
	menuFocus(),
	'menu-popup',
);
await k.press('ArrowDown');
k.expect(
	'menu: ArrowDown on the panel focuses the first row',
	menuFocus(),
	'menu-0',
);
await k.press('Escape');

// ─── Typeahead and disabled rows ─────────────────────────────────────────────

const KEY_ROW_IDS = [0, 1, 2, 3, 4].map((index) => `keys-${index}`);
const keysFocus = () => focusedAmong(['keys-trigger', ...KEY_ROW_IDS]);
await k.scrollIntoView('keys-trigger');
await k.focus('keys-trigger');
await k.press('Enter');
k.expect('keys: opens on the first row', keysFocus(), 'keys-0');
await k.press('ArrowDown');
k.expect('keys: arrows land on a disabled row', keysFocus(), 'keys-1');
await k.press('Enter');
k.check('keys: Enter on a disabled row does nothing', k.exists('keys-0'));
// Typeahead forgets the query after 750 ms of real time: the two presses go back to back, not a settle apart, which a loaded machine can stretch past it.
function tap(keystrokes: string) {
	renderer.simulateKeystrokes(keystrokes);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
tap('c');
const afterFirst = keysFocus();
tap('c');
const afterSecond = keysFocus();
k.expect('keys: typeahead focuses the next match', afterFirst, 'keys-3');
k.expect('keys: the same letter again cycles', afterSecond, 'keys-4');
await k.settle(800);
await k.press('c h a r t');
k.expect('keys: a longer query narrows the match', keysFocus(), 'keys-4');
const pickedText = () =>
	renderer.getAllText().find((line) => line.startsWith('picked:')) ?? '';
const changesBefore = Number(pickedText().split('changes: ')[1]);
await k.press('ArrowUp ArrowUp ArrowUp ArrowUp Enter');
k.expect(
	'keys: Enter picks the focused row and closes',
	pickedText(),
	`picked: Alpha changes: ${changesBefore + 1}`,
);
k.expect(
	'keys: a pick returns focus to the trigger',
	keysFocus(),
	'keys-trigger',
);

// ─── Submenus ────────────────────────────────────────────────────────────────

const SUB_IDS = [
	'sub-trigger',
	'sub-move',
	'sub-share',
	'sub-rename',
	'sub-folder-Inbox',
	'sub-folder-Design',
	'sub-folder-Engineering',
];
const subFocus = () => focusedAmong(SUB_IDS);
await k.scrollIntoView('sub-trigger');
await k.focus('sub-trigger');
await k.press('Enter');
k.expect('sub: opens on the first row', subFocus(), 'sub-move');
await k.press('ArrowRight');
k.expect(
	"sub: ArrowRight on a sub-trigger focuses the submenu's first row",
	subFocus(),
	'sub-folder-Inbox',
);
await k.press('ArrowDown');
k.expect(
	'sub: arrows move inside the submenu',
	subFocus(),
	'sub-folder-Design',
);
await k.press('ArrowLeft');
k.expect(
	'sub: ArrowLeft closes the submenu and focuses its trigger',
	subFocus(),
	'sub-move',
);
k.check('sub: the submenu is gone', !k.exists('sub-folder-Inbox'));
k.check('sub: the parent menu stays open', k.exists('sub-rename'));
await k.press('Enter');
k.expect(
	"sub: Enter on a sub-trigger focuses the submenu's first row",
	subFocus(),
	'sub-folder-Inbox',
);
await k.press('Escape');
k.expect('sub: Escape closes only the submenu', subFocus(), 'sub-move');
k.check(
	'sub: the parent menu is still open after Escape',
	k.exists('sub-rename'),
);
await k.press('ArrowDown ArrowDown');
k.expect(
	'sub: the parent keeps arrowing after the submenu closes',
	subFocus(),
	'sub-rename',
);
await k.press('ArrowUp ArrowUp Enter');
await k.press('Tab');
k.check(
	'sub: Tab inside a submenu closes the whole menu',
	!k.exists('sub-move') && !k.exists('sub-folder-Inbox'),
);
await k.focus('sub-trigger');
await k.press('Enter');
await k.press('Escape');
k.expect(
	'sub: Escape in the parent returns focus to the trigger',
	subFocus(),
	'sub-trigger',
);

// A submenu the pointer opened leaves focus on its parent row.
await k.press('Enter');
const move = k.bounds('sub-move');
renderer.nativeSimulateMouseMove(move.x + 40, move.y + move.height / 2);
await k.settle(600);
k.check('sub: hover opens the submenu', k.exists('sub-folder-Inbox'));
k.expect(
	'sub: a hover-opened submenu leaves focus on the parent row',
	subFocus(),
	'sub-move',
);
await k.press('ArrowRight');
k.expect(
	'sub: ArrowRight then enters the hover-opened submenu',
	subFocus(),
	'sub-folder-Inbox',
);
await k.press('Escape');
await k.press('Escape');

// ─── Searchable menu: the field and the rows are all real focus targets ─────

const shown = (text: string) =>
	renderer.getAllText().some((line) => line === text);
async function openSearch() {
	await k.scrollIntoView('search-trigger');
	await k.focus('search-trigger');
	await k.press('Enter');
	await k.settle(300);
}
async function pickWith(keys: string, expected: string, label: string) {
	await openSearch();
	await k.press(keys);
	k.check(label, shown(expected), `trigger shows ${expected}`);
	if (k.exists('search-0')) await k.press('Escape');
}

await pickWith(
	'ArrowDown ArrowDown Space',
	'Albanian (Albania)',
	'search: Space activates the lit row',
);
await pickWith(
	'ArrowDown ArrowDown ArrowDown ArrowDown Home ArrowDown ArrowDown Enter',
	'Arabic',
	'search: Home lights the first row',
);
await pickWith(
	'ArrowDown End ArrowUp Enter',
	'Ukrainian',
	'search: End lights the last row',
);

// No row lit: the field owns Space. " " keeps only the eight languages with a space.
await openSearch();
await k.press('Space');
k.check(
	'search: Space types into the field while no row is lit',
	k.exists('search-7') && !k.exists('search-8') && !shown('Arabic'),
);
await k.press('Escape');
k.expect(
	'search: Escape returns focus to the trigger',
	focusedAmong(['search-trigger']),
	'search-trigger',
);

const SEARCH_ROWS = Array.from({ length: 80 }, (_, index) => `search-${index}`);
const searchFocus = () => focusedAmong(['search-field', ...SEARCH_ROWS]);
const lastSearchRow = () => {
	const rows = SEARCH_ROWS.filter((testId) => k.exists(testId));
	return rows[rows.length - 1];
};

await openSearch();
k.expect(
	'search: the field takes focus on open',
	searchFocus(),
	'search-field',
);
await k.settle(400);
const fieldRest = k.bounds('search-field');
const searchBoxes = Object.values(renderer.getA11yTree().nodes ?? {}).filter(
	(node) => node.aria?.role === 'SearchInput',
);
k.check('search: the field is a search box', searchBoxes.length === 1);
k.check(
	'search: the field names no active descendant',
	searchBoxes[0]?.aria?.active_descendant === undefined,
);
await k.press('ArrowDown');
k.expect(
	'search: ArrowDown in the field focuses the first row',
	searchFocus(),
	'search-0',
);
await k.press('ArrowUp');
k.expect(
	'search: ArrowUp from the first row returns to the field',
	searchFocus(),
	'search-field',
);
await k.press('ArrowUp');
k.expect(
	'search: ArrowUp in the field focuses the last row',
	searchFocus(),
	lastSearchRow(),
);
// The field sticks to the top edge of the scroller.
await k.settle(400);
k.check(
	'search: the field stays at the top while the rows scroll under it',
	k.bounds('search-field').y === fieldRest.y &&
		k.bounds('search-0').y < fieldRest.y,
);
await k.press('Home');
k.check(
	'search: Home reveals the first row below the field',
	k.bounds('search-field').y === fieldRest.y &&
		// The input sits 6px inside the 36px field row.
		k.bounds('search-0').y >= fieldRest.y - 6 + 36,
);
await k.press('End ArrowDown');
k.expect(
	'search: ArrowDown past the last row returns to the field',
	searchFocus(),
	'search-field',
);
await k.press('ArrowDown ArrowDown');
k.expect('search: arrows walk the rows', searchFocus(), 'search-1');
await k.press('f');
k.expect(
	'search: a key typed on a row moves focus to the field',
	searchFocus(),
	'search-field',
);
await k.press('r');
k.check(
	'search: typing goes into the query in order',
	shown('French') && !shown('Finnish') && !shown('Arabic'),
);
await k.press('Enter');
k.check(
	'search: Enter in the field picks nothing',
	k.exists('search-0') && shown('French'),
);
await k.press('ArrowDown Backspace');
k.expect(
	'search: Backspace on a row goes to the field',
	searchFocus(),
	'search-field',
);
k.check('search: Backspace shortens the query', shown('Finnish'));
await k.press('Escape');
k.expect(
	'search: Escape returns focus to the trigger',
	focusedAmong(['search-trigger']),
	'search-trigger',
);

// ─── A menu opened with a pointer press ──────────────────────────────────────

// A real press on the trigger: no keyboard, nothing focused before.
async function openBare(
	testId: string,
	rows: readonly { label: string; disabled?: boolean }[],
) {
	const root = createTestRoot({ width: 600, height: 400, fonts });
	root.render(() => (
		<DropdownMenu testId={testId}>
			<DropdownTrigger>
				{(trigger) => (
					<Button
						testId={`${testId}-trigger`}
						{...trigger.attributes}
						onMouseDown={trigger.onMouseDown}
						onClick={trigger.onClick}
					>
						Open
					</Button>
				)}
			</DropdownTrigger>
			<DropdownContent>
				{rows.map((row, index) => (
					<MenuItem
						testId={`${testId}-${index}`}
						index={index}
						label={row.label}
						disabled={row.disabled}
					/>
				))}
			</DropdownContent>
		</DropdownMenu>
	));
	const candidates = [
		`${testId}-trigger`,
		`${testId}-popup`,
		...rows.map((_, index) => `${testId}-${index}`),
	];
	return {
		async settle(ms: number) {
			const until = performance.now() + ms;
			do {
				root.renderer.flush();
				root.renderer.dispatchNativeEvents();
				await sleep(16);
			} while (performance.now() < until);
		},
		focus() {
			const focused = root.renderer.getFocusedElementId();
			return (
				candidates.find((candidate) => {
					const element = root.renderer.findByTestId(candidate);
					return element !== undefined && element.id === focused;
				}) ?? null
			);
		},
		async open() {
			const trigger = root.renderer.findByTestId(`${testId}-trigger`);
			if (trigger === undefined) throw new Error(`no ${testId}-trigger`);
			const box = root.renderer.getElementBounds(trigger.id);
			if (box === null) throw new Error(`no bounds for ${testId}-trigger`);
			root.renderer.nativeSimulateClick(
				box.x + box.width / 2,
				box.y + box.height / 2,
			);
		},
		clickAt(x: number, y: number) {
			root.renderer.nativeSimulateClick(x, y);
		},
		isOpen: () => root.renderer.findByTestId(`${testId}-popup`) !== undefined,
		keys: (keystrokes: string) => root.renderer.simulateKeystrokes(keystrokes),
		unmount: () => root.unmount(),
	};
}

const bare = await openBare('bare', [
	{ label: 'One' },
	{ label: 'Two' },
	{ label: 'Three' },
]);
await bare.settle(300);
await bare.open();
await bare.settle(600);
k.expect(
	'pointer open: the first enabled row is focused two frames later',
	bare.focus(),
	'bare-0',
);
bare.keys('ArrowDown');
await bare.settle(300);
k.expect(
	'pointer open: ArrowDown moves on from the first row',
	bare.focus(),
	'bare-1',
);
bare.clickAt(560, 380);
await bare.settle(400);
k.check('pointer open: a press on bare background closes it', !bare.isOpen());
k.expect(
	'pointer open: the trigger takes focus back after that press',
	bare.focus(),
	'bare-trigger',
);
bare.unmount();

const idle = await openBare('idle', [
	{ label: 'One', disabled: true },
	{ label: 'Two', disabled: true },
]);
await idle.settle(300);
await idle.open();
await idle.settle(600);
k.expect(
	'pointer open: with no enabled row the popup panel keeps focus',
	idle.focus(),
	'idle-popup',
);
idle.keys('ArrowDown');
await idle.settle(300);
k.expect(
	'pointer open: ArrowDown on the panel reaches a disabled row',
	idle.focus(),
	'idle-0',
);
idle.unmount();

// ─── A search field in the inline panel is simply open ──────────────────────

const inlineSearch = await createCheck(
	() => (
		<div style={{ padding: 20, width: 320 }}>
			<Dropdown testId="inline-search">
				<DropdownSearch value="" onValueChange={() => {}} />
				<MenuItem testId="inline-search-0" index={0} label="One" />
				<MenuItem testId="inline-search-1" index={1} label="Two" />
			</Dropdown>
		</div>
	),
	{ width: 400, height: 300, initialSettleMs: 600 },
);
inlineSearch.check(
	'inline search: the field is drawn above the rows',
	inlineSearch.exists('inline-search-field') &&
		inlineSearch.bounds('inline-search-field').y <
			inlineSearch.bounds('inline-search-0').y,
);
{
	const rowIds = ['inline-search-0', 'inline-search-1'];
	const rowFocus = () => {
		const focused = inlineSearch.renderer.getFocusedElementId();
		return (
			['inline-search-field', ...rowIds].find(
				(id) => inlineSearch.element(id).id === focused,
			) ?? null
		);
	};
	inlineSearch.expect(
		'inline search: the field takes focus',
		rowFocus(),
		'inline-search-field',
	);
	await inlineSearch.press('ArrowDown');
	inlineSearch.expect(
		'inline search: ArrowDown in the field focuses the first row',
		rowFocus(),
		'inline-search-0',
	);
	await inlineSearch.press('ArrowUp');
	inlineSearch.expect(
		'inline search: ArrowUp from the first row steps on, as the rows do alone',
		rowFocus(),
		'inline-search-1',
	);
}

// ─── Lighting a row eases its icon stroke and colour and its label colour over 80 ms ─

const ease = await createCheck(
	() => (
		<div style={{ padding: 20, width: 260 }}>
			<Dropdown>
				<MenuItem testId="ease-0" index={0} label="Settings" icon="settings" />
				<MenuItem testId="ease-1" index={1} label="Profile" icon="user" />
			</Dropdown>
		</div>
	),
	{ width: 400, height: 300, initialSettleMs: 600 },
);
{
	const row = ease.bounds('ease-0');
	const iconBox = {
		x: row.x + 8,
		y: row.y + 4,
		width: 16,
		height: row.height - 8,
	};
	const labelBox = {
		x: row.x + 32,
		y: row.y + 4,
		width: 70,
		height: row.height - 8,
	};
	const rest = { icon: ease.ink(iconBox), label: ease.ink(labelBox) };
	const point = ease.center('ease-0');
	ease.renderer.clockPause();
	ease.renderer.nativeSimulateMouseMove(point.x - 1, point.y);
	ease.renderer.nativeSimulateMouseMove(point.x, point.y);
	for (const ms of [0, 16, 16]) {
		ease.renderer.clockFastForward(ms);
		ease.renderer.flush();
		ease.renderer.dispatchNativeEvents();
	}
	const early = { icon: ease.ink(iconBox), label: ease.ink(labelBox) };
	ease.renderer.clockResume();
	await ease.settle(400);
	const lit = { icon: ease.ink(iconBox), label: ease.ink(labelBox) };
	const partway = (name: 'icon' | 'label') =>
		early[name] > rest[name] + 0.1 * (lit[name] - rest[name]) &&
		early[name] < lit[name] - 0.1 * (lit[name] - rest[name]);
	k.check(
		"ease: the icon's stroke and colour are partway 32 ms after the row lights",
		partway('icon'),
		`rest ${rest.icon}, early ${early.icon}, lit ${lit.icon}`,
	);
	k.check(
		"ease: the label's colour is partway 32 ms after the row lights",
		partway('label'),
		`rest ${rest.label}, early ${early.label}, lit ${lit.label}`,
	);
}

// ─── Submenu safe polygon ───────────────────────────────────────────────────

// `safePolygon({ blockPointerEvents: true })`: a hover-opened submenu follows the pointer from its trigger, and the parent rows it crosses on the way stay unlit. A bare view, not the demo page: the polygon reads real time between pointer moves, and the page's frames are slower than its 40 ms.
const poly = await createCheck(
	() => (
		<div style={{ display: 'flex', flexDirection: 'row', padding: 40 }}>
			<DropdownMenu testId="poly">
				<DropdownTrigger>
					{(trigger) => (
						<Button
							testId="poly-trigger"
							variant="ghost"
							{...trigger.attributes}
							onMouseDown={trigger.onMouseDown}
							onClick={trigger.onClick}
						>
							Open
						</Button>
					)}
				</DropdownTrigger>
				<DropdownContent>
					<DropdownSub>
						<DropdownSubTrigger testId="poly-move" index={0} label="Move to" />
						<DropdownSubContent>
							{['Inbox', 'Design', 'Engineering', 'Marketing'].map(
								(folder, index) => (
									<MenuItem
										testId={`poly-folder-${folder}`}
										index={index}
										label={folder}
									/>
								),
							)}
						</DropdownSubContent>
					</DropdownSub>
					<MenuItem testId="poly-share" index={1} label="Share" />
					<MenuItem testId="poly-rename" index={2} label="Rename" />
				</DropdownContent>
			</DropdownMenu>
		</div>
	),
	{ width: 900, height: 500, initialSettleMs: 600 },
);
{
	const polyIds = [
		'poly-move',
		'poly-share',
		'poly-rename',
		'poly-folder-Inbox',
		'poly-folder-Design',
		'poly-folder-Engineering',
	];
	const polyFocus = () => {
		const focused = poly.renderer.getFocusedElementId();
		return (
			polyIds.find(
				(id) => poly.exists(id) && poly.element(id).id === focused,
			) ?? null
		);
	};
	const submenuOpen = () => poly.exists('poly-folder-Inbox');
	await poly.click('poly-trigger');
	await poly.settle(300);
	const moveRow = poly.bounds('poly-move');
	// Left of the row's centre, so a path to the submenu leaves the row by its bottom edge and crosses the row below.
	const triggerPoint = {
		x: moveRow.x + 40,
		y: moveRow.y + moveRow.height / 2,
	};
	poly.renderer.nativeSimulateMouseMove(triggerPoint.x, triggerPoint.y);
	await poly.settle(600);
	k.check('polygon: hovering the trigger opens the submenu', submenuOpen());
	let siblingLit = false;
	await poly.glide(
		triggerPoint,
		poly.center('poly-folder-Engineering'),
		20,
		() => {
			if (polyFocus() === 'poly-share') siblingLit = true;
		},
	);
	await poly.settle(200);
	k.check(
		'polygon: a diagonal across the row below keeps the submenu open',
		submenuOpen(),
	);
	k.check('polygon: the row it crossed was never lit', !siblingLit);

	// Landed on the submenu, the pointer is the parent list's again: going back out across a sibling row closes it and lights that row.
	const shareMid = poly.center('poly-share');
	await poly.glide(
		poly.center('poly-folder-Engineering'),
		{ x: shareMid.x - 40, y: shareMid.y },
		12,
	);
	await poly.settle(300);
	k.check(
		'polygon: leaving the submenu for a sibling row closes it',
		!submenuOpen(),
	);
	poly.renderer.nativeSimulateMouseMove(shareMid.x - 41, shareMid.y);
	await poly.settle(100);
	k.expect('polygon: and lights the sibling row', polyFocus(), 'poly-share');

	// Away from the submenu nothing covers the way: it closes, and the row under the pointer takes the highlight.
	await poly.glide(poly.center('poly-share'), triggerPoint, 6);
	await poly.settle(600);
	k.check('polygon: the submenu opens again', submenuOpen());
	const renameMid = poly.center('poly-rename');
	await poly.glide(triggerPoint, { x: triggerPoint.x, y: renameMid.y }, 8);
	await poly.settle(300);
	k.check(
		'polygon: moving straight down, away from the submenu, closes it',
		!submenuOpen(),
	);
	poly.renderer.nativeSimulateMouseMove(triggerPoint.x + 1, renameMid.y);
	await poly.settle(100);
	k.expect(
		'polygon: and lights the row it reached',
		polyFocus(),
		'poly-rename',
	);
	await poly.press('Escape');
}

k.finish();
