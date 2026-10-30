/**
 * The dialog's window-relative layout: the panel is `calc(100% - 2rem)` wide up to its size's maximum and
 * `position="top"` sits 12vh down, both following a window resize.
 *
 *   bun scripts/check-dialog.tsx
 */
import { Button } from '#/components/button';
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '#/components/dialog';
import { createCheck } from './check-kit';

function Opener(props: { position: 'center' | 'top' }) {
	return (
		<Dialog>
			<DialogTrigger>
				<Button testId="open">Open</Button>
			</DialogTrigger>
			<DialogContent
				size="sm"
				position={props.position}
				showCloseButton={false}
				testId="popup"
			>
				<DialogTitle>Title</DialogTitle>
			</DialogContent>
		</Dialog>
	);
}

let failures = 0;
for (const position of ['center', 'top'] as const) {
	const ui = await createCheck(() => <Opener position={position} />, {
		width: 800,
		height: 600,
		initialSettleMs: 300,
	});
	await ui.click('open');
	const wide = ui.bounds('popup');
	ui.expect(
		`${position}: 400px wide, centred in 800px`,
		[wide.x, wide.width],
		[200, 400],
	);
	if (position === 'top')
		ui.expect(`${position}: 12vh of 600 down`, wide.y, 72);

	ui.renderer.setWindowSize(300, 400);
	await ui.settle(400);
	const narrow = ui.bounds('popup');
	ui.expect(
		`${position}: 1rem each side at 300px`,
		[narrow.x, narrow.width],
		[16, 268],
	);
	if (position === 'top')
		ui.expect(`${position}: 12vh of 400 down`, narrow.y, 48);
	else
		ui.expect(
			`${position}: centred vertically at 400px`,
			narrow.y + narrow.height / 2,
			200,
		);
	failures += ui.unmount();
}

// The panel springs from `scale` .97 about its centre, in and out, and the flex centring leaves it on the source's pixels at rest.
{
	const ui = await createCheck(() => <Opener position="center" />, {
		width: 800,
		height: 600,
		initialSettleMs: 300,
	});
	const panel = () => {
		const popup = ui.element('popup');
		for (const id of ui.renderer.getElement(popup.id)?.children ?? []) {
			const box = ui.renderer.getElementBounds(id);
			if (box !== null && box.height > 0) return box;
		}
		throw new Error('the dialog has no panel');
	};
	const open = ui.center('open');
	ui.renderer.clockPause();
	try {
		ui.renderer.nativeSimulateClick(open.x, open.y);
		ui.step(0);
		ui.step(0);
		ui.step(8);
		const entering = panel();
		ui.step(600);
		ui.step(0);
		const rest = panel();
		ui.check(
			'the panel enters smaller than it rests, about its centre',
			entering.width < rest.width - 0.5 &&
				entering.height < rest.height - 0.5 &&
				Math.abs(entering.x + entering.width / 2 - (rest.x + rest.width / 2)) <
					0.5 &&
				Math.abs(
					entering.y + entering.height / 2 - (rest.y + rest.height / 2),
				) < 0.5,
			`${entering.width.toFixed(2)} x ${entering.height.toFixed(2)} -> ${rest.width} x ${rest.height}`,
		);
		ui.expect(
			'at rest the panel is 400 wide, centred in 800 x 600',
			[rest.x, rest.width, rest.y + rest.height / 2],
			[200, 400, 300],
		);
		ui.renderer.simulateKeystrokes('Escape');
		ui.step(0);
		ui.step(20);
		const leaving = panel();
		ui.check(
			'closing, the panel shrinks back',
			leaving.width < rest.width - 0.5,
			`${leaving.width.toFixed(2)}`,
		);
	} finally {
		ui.renderer.clockResume();
	}
	failures += ui.unmount();
}
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
