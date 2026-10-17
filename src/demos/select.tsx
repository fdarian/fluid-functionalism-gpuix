import type { HostElement } from '@gpuix/solid';
import { createSignal } from 'solid-js';
import { Button } from '#/components/button';
import { Select, type SelectEntry } from '#/components/select';
import type { DemoModule, ShotContext } from '#/lib/demo';
import { DemoCard, DemoRow } from '#/lib/demo-kit';
import { color, type as scale } from '#/lib/theme';

const FRUITS = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'cherry', label: 'Cherry' },
	{ value: 'mango', label: 'Mango' },
] as const;

const THEMES = [
	{ value: 'system', label: 'System', icon: 'monitor' },
	{ value: 'light', label: 'Light', icon: 'sun' },
	{ value: 'dark', label: 'Dark', icon: 'moon' },
] as const;

const GROUPS: readonly SelectEntry<string>[] = [
	{ type: 'label', label: 'Account' },
	{ value: 'profile', label: 'Profile', icon: 'user' },
	{ value: 'email', label: 'Email', icon: 'mail' },
	{ type: 'separator' },
	{ type: 'label', label: 'Preferences' },
	{ value: 'notifications', label: 'Notifications', icon: 'bell' },
	{ value: 'privacy', label: 'Privacy', icon: 'shield' },
];

const TIMEZONES = [
	['utc-8', '(UTC-8) Pacific Time'],
	['utc-7', '(UTC-7) Mountain Time'],
	['utc-6', '(UTC-6) Central Time'],
	['utc-5', '(UTC-5) Eastern Time'],
	['utc-4', '(UTC-4) Atlantic Time'],
	['utc-3', '(UTC-3) Buenos Aires'],
	['utc-1', '(UTC-1) Azores'],
	['utc+0', '(UTC+0) London'],
	['utc+1', '(UTC+1) Paris'],
	['utc+2', '(UTC+2) Helsinki'],
	['utc+3', '(UTC+3) Moscow'],
	['utc+5:30', '(UTC+5:30) Mumbai'],
	['utc+8', '(UTC+8) Singapore'],
	['utc+9', '(UTC+9) Tokyo'],
	['utc+10', '(UTC+10) Sydney'],
	['utc+12', '(UTC+12) Auckland'],
].map(([value, label]) => ({ value, label }));

const ROLES = [
	{ value: 'admin', label: 'Admin' },
	{ value: 'editor', label: 'Editor' },
	{ value: 'viewer', label: 'Viewer' },
];

const SOME_DISABLED = [
	{ value: 'a', label: 'Available' },
	{ value: 'b', label: 'Unavailable', disabled: true },
	{ value: 'c', label: 'Also available' },
];

const KEYS = [
	{ value: 'kiwi', label: 'Kiwi' },
	{ value: 'lemon', label: 'Lemon' },
	{ value: 'lime', label: 'Lime juice' },
	{ value: 'melon', label: 'Melon' },
];

const FIGS = [
	{ value: 'fig', label: 'Fig' },
	{ value: 'grape', label: 'Grape' },
	{ value: 'guava', label: 'Guava' },
	{ value: 'honey', label: 'Honey' },
];

export const title = 'Select';
export const group = 'Components';
export const listed = 'sidebar';

export function Demo() {
	const [fruit, setFruit] = createSignal<string | null>(null);
	const [bordered, setBordered] = createSignal<string | null>(null);
	const [borderless, setBorderless] = createSignal<string | null>(null);
	const [theme, setTheme] = createSignal<string | null>('system');
	const [compact, setCompact] = createSignal<string | null>('banana');
	const [setting, setSetting] = createSignal<string | null>(null);
	const [timezone, setTimezone] = createSignal<string | null>(null);
	const [role, setRole] = createSignal<string | null>(null);
	const [some, setSome] = createSignal<string | null>(null);
	const [plan, setPlan] = createSignal<string | null>(null);
	const [submitted, setSubmitted] = createSignal('');
	let form: HostElement | undefined;

	const themeIcon = () => {
		const picked = THEMES.find((entry) => entry.value === theme());
		return picked === undefined ? undefined : picked.icon;
	};

	return (
		<>
			<DemoCard title="Select">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<DemoRow label="Basic">
						<Select
							testId="basic"
							variant="bordered"
							items={FRUITS}
							value={fruit()}
							onValueChange={setFruit}
							placeholder="Select a fruit…"
						/>
					</DemoRow>
					<DemoRow label="Variants">
						<Select
							testId="bordered"
							variant="bordered"
							items={FRUITS}
							value={bordered()}
							onValueChange={setBordered}
							placeholder="Bordered"
						/>
						<Select
							testId="borderless"
							variant="borderless"
							items={FRUITS}
							value={borderless()}
							onValueChange={setBorderless}
							placeholder="Borderless"
						/>
					</DemoRow>
					<DemoRow label="With icons">
						<Select
							testId="icons"
							variant="bordered"
							items={THEMES}
							value={theme()}
							onValueChange={setTheme}
							icon={themeIcon()}
							placeholder="Theme"
						/>
					</DemoRow>
					<DemoRow label="Compact">
						<Select
							testId="compact"
							variant="bordered"
							size="compact"
							items={FRUITS}
							value={compact()}
							onValueChange={setCompact}
						/>
					</DemoRow>
				</div>
			</DemoCard>
			<DemoCard title="Select, groups and states">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<DemoRow label="Groups">
						<Select
							testId="groups"
							variant="bordered"
							items={GROUPS}
							value={setting()}
							onValueChange={setSetting}
							placeholder="Settings…"
						/>
					</DemoRow>
					<DemoRow label="Scrollable">
						<Select
							testId="timezone"
							variant="bordered"
							items={TIMEZONES}
							value={timezone()}
							onValueChange={setTimezone}
							icon="globe"
							placeholder="Select timezone…"
						/>
					</DemoRow>
					<DemoRow label="Error">
						<Select
							testId="error"
							variant="bordered"
							items={ROLES}
							value={role()}
							onValueChange={setRole}
							placeholder="Select a role…"
							error="Please select a role to continue."
						/>
					</DemoRow>
					<DemoRow label="Disabled">
						<Select
							testId="disabled"
							variant="bordered"
							items={ROLES}
							value={null}
							onValueChange={() => {}}
							placeholder="Disabled"
							disabled
						/>
						<Select
							testId="some-disabled"
							variant="bordered"
							items={SOME_DISABLED}
							value={some()}
							onValueChange={setSome}
							placeholder="Some disabled…"
						/>
					</DemoRow>
					<DemoRow label="Uncontrolled">
						<Select
							testId="keys"
							variant="bordered"
							size="compact"
							items={KEYS}
							placeholder="Keys…"
						/>
						<Select
							testId="keys-up"
							variant="bordered"
							size="compact"
							items={FIGS}
							placeholder="Keys up…"
						/>
						<Select
							testId="default"
							variant="bordered"
							size="compact"
							items={KEYS}
							defaultValue="lemon"
						/>
					</DemoRow>
				</div>
			</DemoCard>
			<DemoCard title="Select, in a form">
				<form
					ref={form}
					testId="form"
					onSubmit={(event) =>
						setSubmitted(
							Array.from(
								event.formData.entries(),
								(entry) => `${entry[0]}=${entry[1]}`,
							).join('&'),
						)
					}
					style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
				>
					<DemoRow label="Form">
						<input
							testId="form-name"
							name="name"
							value="Ada"
							placeholder="Name"
							style={{ width: 120, height: 28 }}
						/>
						<text
							id="form-plan-label"
							style={{ ...scale.caption, color: color.mutedForeground }}
						>
							Plan
						</text>
						<Select
							testId="form-plan"
							variant="bordered"
							size="compact"
							name="plan"
							required
							labelledBy="form-plan-label"
							items={FRUITS}
							value={plan()}
							onValueChange={setPlan}
							placeholder="Choose…"
						/>
					</DemoRow>
					<DemoRow label="">
						<Button
							testId="form-submit"
							variant="secondary"
							size="compact"
							onClick={() => form?.requestSubmit()}
						>
							Submit
						</Button>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							{`submitted: ${submitted()}`}
						</text>
					</DemoRow>
				</form>
			</DemoCard>
		</>
	);
}

/** The page is taller than the window: scroll an element to the upper part of it. */
async function reveal(shot: ShotContext, testId: string) {
	let previous = Number.NaN;
	for (let attempt = 0; attempt < 8; attempt++) {
		const y = shot.centerOf(testId).y;
		if ((y > 120 && y < 320) || y === previous) return;
		previous = y;
		await shot.scroll(700, 400, 0, y - 200);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

export const scenarios: DemoModule['scenarios'] = async (shot) => {
	await reveal(shot, 'form-submit');
	// Form: an empty required select blocks the submit and hands focus to its trigger; once picked its value is submitted under its name.
	await shot.click('form-submit');
	shot.expectText('submitted: name=Ada', false);
	shot.expectAria('form-plan-trigger', {
		role: 'ComboBox',
		has_popup: 'Listbox',
		required: true,
		expanded: false,
		labelled_by: ['form-plan-label'],
		controls: undefined,
	});
	await shot.press('ArrowDown');
	shot.expectAria('form-plan-trigger', { expanded: true });
	const listbox = shot.aria('form-plan-trigger').controls;
	if (!Array.isArray(listbox) || listbox.length !== 1)
		throw new Error('an open select controls its list');
	shot.expectAria(String(listbox[0]), { role: 'ListBox' });
	shot.expectAria('form-plan-option-apple', {
		role: 'ListBoxOption',
		selected: false,
	});
	await shot.press('Enter');
	await shot.settle(600);
	await shot.click('form-submit');
	shot.expectText('submitted: name=Ada&plan=apple', true);

	// The form sits far down the page: back to the top for the basic select.
	await shot.scroll(700, 400, 0, -100000);
	await shot.click('basic');
	await shot.settle(300);
	shot.expectText('Banana', true);
	shot.capture('basic-open');

	await shot.hover('basic-option-banana');
	shot.capture('basic-hover');

	await shot.click('basic-option-banana');
	shot.expectText('Banana', true);
	await shot.settle(500);
	shot.expectText('Cherry', false);
	shot.capture('basic-picked');

	await shot.click('basic');
	await shot.settle(300);
	shot.capture('basic-reopened');
	await shot.press('c');
	await shot.settle(300);
	shot.capture('basic-typeahead');
	await shot.press('Escape');
	shot.expectText('Cherry', false);

	await shot.click('icons');
	await shot.settle(300);
	shot.capture('icons-open');
	await shot.press('Escape');

	await shot.click('groups');
	await shot.settle(300);
	shot.expectText('Preferences', true);
	shot.capture('groups-open');
	await shot.press('Escape');

	await shot.click('timezone');
	await shot.settle(300);
	shot.capture('timezone-open');
	for (let step = 0; step < 14; step++) await shot.press('ArrowDown');
	await shot.settle(400);
	shot.capture('timezone-scrolled');
	await shot.press('Enter');
	await shot.settle(300);
	await shot.click('timezone');
	await shot.settle(400);
	shot.capture('timezone-reopened');
	await shot.press('Escape');

	// Arrows land on disabled rows, Enter refuses them, the popup stays open.
	await shot.click('some-disabled');
	await shot.press('Escape');
	await shot.press('ArrowDown ArrowDown');
	shot.expectText('Unavailable', true);
	shot.capture('some-disabled-keyboard');
	await shot.press('Enter');
	await shot.settle(500);
	shot.expectText('Unavailable', true);
	await shot.press('ArrowDown Enter');
	await shot.settle(600);
	shot.expectText('Unavailable', false);
	shot.expectText('Also available', true);

	// Uncontrolled: `defaultValue` shows without any state of ours.
	shot.expectText('Lemon', true);
	shot.expectText('Kiwi', false);

	// Opens on mouse-down; the release on the trigger leaves it open.
	await shot.down('keys');
	shot.expectText('Kiwi', true);
	shot.capture('keys-mouse-down');
	await shot.up('keys');
	shot.expectText('Kiwi', true);
	await shot.press('Escape');
	shot.expectText('Kiwi', false);

	// A keyboard open highlights the first row, and the arrows stop at the ends.
	await shot.press('ArrowDown');
	shot.expectText('Kiwi', true);
	await shot.press('ArrowUp');
	await shot.press('Enter');
	await shot.settle(500);
	shot.expectText('Kiwi', true);
	shot.expectText('Melon', false);

	// Home and End jump to the ends.
	await shot.press('ArrowDown End');
	shot.capture('keys-end');
	await shot.press('Enter');
	await shot.settle(500);
	shot.expectText('Melon', true);
	shot.expectText('Kiwi', false);
	await shot.press('ArrowDown Home Enter');
	await shot.settle(500);
	shot.expectText('Kiwi', true);
	shot.expectText('Melon', false);

	// Typeahead on a closed trigger commits and does not open; Space continues the session.
	await shot.press('l i m e Space j');
	await shot.settle(300);
	shot.expectText('Lime juice', true);
	shot.expectText('Melon', false);

	// Press the trigger, hold past 400 ms, release over a row: it picks.
	await shot.down('keys');
	shot.expectText('Melon', true);
	await shot.up('keys-option-melon');
	await shot.settle(600);
	shot.expectText('Kiwi', false);
	shot.expectText('Melon', true);
	// Focus came back to the trigger, so a key opens it again.
	await shot.press('ArrowDown');
	shot.expectText('Kiwi', true);
	await shot.press('Escape');

	// ArrowUp opens on the last row.
	await shot.click('keys-up');
	await shot.press('Escape');
	await shot.press('ArrowUp');
	shot.expectText('Fig', true);
	await shot.press('Enter');
	await shot.settle(500);
	shot.expectText('Honey', true);
	shot.expectText('Fig', false);
	await shot.press('f');
	shot.expectText('Fig', true);
	shot.expectText('Grape', false);
	// The same letter twice cycles; a chord is not typeahead. Wait out the "f" session first.
	await shot.settle(800);
	await shot.press('g g');
	shot.expectText('Guava', true);
	shot.expectText('Grape', false);
	await shot.press('Meta+h');
	shot.expectText('Honey', false);
	await shot.moveTo(1180, 700);
};
