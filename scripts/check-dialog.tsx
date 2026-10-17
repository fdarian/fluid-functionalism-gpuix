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
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
