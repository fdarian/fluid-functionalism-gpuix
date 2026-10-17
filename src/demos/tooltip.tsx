import { createSignal, For } from 'solid-js';
import { Button } from '#/components/button';
import {
	Tooltip,
	TooltipProvider,
	type TooltipSide,
} from '#/components/tooltip';
import type { DemoModule } from '#/lib/demo';
import { DemoCard, DemoRow } from '#/lib/demo-kit';
import { color, type as scale, weight } from '#/lib/theme';

const SIDES: TooltipSide[] = ['top', 'right', 'bottom', 'left'];

function sideLabel(side: TooltipSide) {
	return side[0].toUpperCase() + side.slice(1);
}

function FollowArea(props: {
	axis: 'x' | 'y';
	side: TooltipSide;
	width: number;
	height: number;
}) {
	return (
		<Tooltip
			testId={`follow-${props.axis}`}
			content={`Following ${props.axis}`}
			side={props.side}
			followCursor={props.axis}
		>
			<div
				style={{
					width: props.width,
					height: props.height,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: 8,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: color.border,
					cursor: 'default',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					<For
						each={
							props.axis === 'x' ? ['Move along me'] : ['Move', 'along', 'me']
						}
					>
						{(word) => (
							<text style={{ ...scale.caption, color: color.mutedForeground }}>
								{word}
							</text>
						)}
					</For>
				</div>
			</div>
		</Tooltip>
	);
}

export const title = 'Tooltip';
export const group = 'Components';
export const listed = 'sidebar';

export function Demo() {
	const [saves, setSaves] = createSignal(0);
	const [opened, setOpened] = createSignal(0);
	return (
		<>
			<DemoCard title="Tooltip">
				<TooltipProvider>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
						<DemoRow label="Basic">
							<Tooltip
								testId="basic"
								content="Save your changes"
								onOpenChange={(open) => open && setOpened(opened() + 1)}
							>
								<Button
									testId="basic-trigger"
									onClick={() => setSaves(saves() + 1)}
								>
									Hover me
								</Button>
							</Tooltip>
							<text style={{ ...scale.caption, color: color.mutedForeground }}>
								{`Clicked ${saves()} times, opened ${opened()}`}
							</text>
						</DemoRow>
						<DemoRow label="Rich content">
							<Tooltip
								testId="rich"
								content={
									<div
										style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
									>
										<text
											style={{
												...scale.caption,
												color: color.background,
												fontWeight: weight.semibold,
											}}
										>
											Keyboard shortcut
										</text>
										<text
											style={{ ...scale.caption, color: color.mutedForeground }}
										>
											⌘ + S
										</text>
									</div>
								}
							>
								<Button testId="rich-trigger">Save</Button>
							</Tooltip>
						</DemoRow>
						<DemoRow label="Delay">
							<Tooltip testId="delay-0" content="Instant" delayDuration={0}>
								<Button testId="delay-0-trigger" variant="secondary">
									No delay
								</Button>
							</Tooltip>
							<Tooltip testId="delay-500" content="Slow" delayDuration={500}>
								<Button testId="delay-500-trigger" variant="secondary">
									500ms delay
								</Button>
							</Tooltip>
						</DemoRow>
						<DemoRow label="Placement">
							{SIDES.map((side) => (
								<Tooltip
									testId={`side-${side}`}
									content={sideLabel(side)}
									side={side}
								>
									<Button variant="secondary">{sideLabel(side)}</Button>
								</Tooltip>
							))}
						</DemoRow>
					</div>
				</TooltipProvider>
			</DemoCard>
			<DemoCard title="Near the window edge">
				{/* The chip is wider than the room right of the trigger, so it flips to its left. */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'flex-end',
					}}
				>
					<Tooltip
						testId="collide"
						content="This label is far too wide to fit between the trigger and the right edge of the window"
						side="right"
					>
						<Button variant="secondary">Right edge</Button>
					</Tooltip>
				</div>
			</DemoCard>
			<DemoCard title="Follow cursor">
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 24,
					}}
				>
					<FollowArea axis="x" side="top" width={248} height={48} />
					<FollowArea axis="y" side="right" width={48} height={96} />
				</div>
			</DemoCard>
			<DemoCard title="Forced open">
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'center',
						gap: 76,
						paddingTop: 20,
						paddingBottom: 20,
					}}
				>
					{SIDES.map((side) => (
						<Tooltip content={sideLabel(side)} side={side} forceOpen>
							<Button variant="secondary" size="compact">
								{sideLabel(side)}
							</Button>
						</Tooltip>
					))}
				</div>
			</DemoCard>
		</>
	);
}

export const scenarios: DemoModule['scenarios'] = async (shot) => {
	await shot.hover('basic');
	shot.expectText('Save your changes', true);
	await shot.settle(300);
	shot.capture('basic');
	await shot.click('basic');
	shot.expectText('Clicked 1 times, opened', true);
	shot.expectText('opened 1', true);

	// Escape closes it, and the pointer reaching the chip keeps it open.
	await shot.moveTo(900, 700);
	await shot.hover('basic');
	await shot.settle(300);
	shot.expectText('Save your changes', true);
	await shot.press('Escape');
	shot.expectText('Save your changes', false);
	await shot.moveTo(900, 700);
	await shot.hover('basic');
	await shot.settle(300);
	const chip = shot.centerOf('basic-chip');
	await shot.moveTo(chip.x, chip.y);
	await shot.settle(400);
	shot.expectText('Save your changes', true);
	shot.capture('hover-chip');
	await shot.moveTo(900, 700);
	await shot.settle(300);
	shot.expectText('Save your changes', false);

	await shot.hover('rich');
	await shot.settle(300);
	shot.capture('rich');

	for (const side of SIDES) {
		await shot.hover(`side-${side}`);
		await shot.settle(300);
		shot.capture(`placement-${side}`);
	}

	// Too wide for the room on its right: the chip flips to the left of the trigger.
	await shot.hover('collide');
	await shot.settle(300);
	shot.capture('flipped-left');
	if (!(shot.centerOf('collide-chip').x < shot.centerOf('collide').x)) {
		throw new Error('the wide tooltip did not flip to the left');
	}

	await shot.moveTo(900, 700);
	// Let the provider's skip window (300 ms after a close) run out, or the slow tooltip would open at once.
	await shot.settle(600);
	await shot.hover('delay-500');
	shot.expectText('Slow', false);
	await shot.settle(500);
	shot.expectText('Slow', true);
	await shot.settle(300);
	shot.capture('delay-500');

	// Keyboard focus opens at once, past the 500 ms delay too; blur closes it.
	await shot.moveTo(900, 700);
	await shot.settle(600);
	// The Escape above left the last input a key, so script focus counts as keyboard focus.
	await shot.focus('rich-trigger');
	shot.expectText('Keyboard shortcut', true);
	await shot.press('Tab');
	shot.expectText('Instant', true);
	shot.expectText('Keyboard shortcut', false);
	await shot.press('Tab');
	shot.expectText('Instant', false);
	shot.expectText('Slow', true);
	shot.capture('keyboard-focus');
	await shot.press('Escape');
	shot.expectText('Slow', false);

	await shot.hover('follow-x');
	await shot.settle(300);
	shot.capture('follow-x-centre');
	const area = shot.centerOf('follow-x');
	await shot.moveTo(area.x - 90, area.y);
	await shot.settle(300);
	shot.capture('follow-x-left');
	const tall = shot.centerOf('follow-y');
	await shot.moveTo(tall.x, tall.y + 30);
	await shot.settle(300);
	shot.capture('follow-y-low');

	await shot.moveTo(900, 700);
	shot.expectText('Following y', false);
};
