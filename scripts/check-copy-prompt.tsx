/**
 * The Copy prompt button's glyph: the copy mark and the check share one 16px cell. Copying scales the copy mark to 0.6 and fades
 * it over 60 ms (eased in) while the check comes up from 0.6 to 1 over 80 ms (eased out); two seconds later it plays back.
 *
 *   bun scripts/check-copy-prompt.tsx
 */
import { CopyPromptButton } from '#/lib/doc-page';
import { createCheck } from './check-kit';

const kit = await createCheck(() => (
	<div style={{ padding: 40 }}>
		<CopyPromptButton prompt="a brief" />
	</div>
));
const renderer = kit.renderer;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await kit.settle(200);

const size = (testId: string) => kit.bounds(testId).width;
const near = (actual: number, expected: number) =>
	Math.abs(actual - expected) < 0.2;
kit.check(
	'at rest the copy mark is full size and the check is at 0.6',
	near(size('copy-prompt-copy'), 16) && near(size('copy-prompt-check'), 9.6),
	`${size('copy-prompt-copy')} and ${size('copy-prompt-check')}`,
);

renderer.clockPause();
const button = kit.center('copy-prompt');
renderer.nativeSimulateClick(button.x, button.y);
await sleep(50);
renderer.flush();
renderer.dispatchNativeEvents();
kit.step(16);
kit.check(
	'copying crossfades: both marks are part-way through at 16 ms',
	size('copy-prompt-copy') < 15.9 &&
		size('copy-prompt-copy') > 9.7 &&
		size('copy-prompt-check') > 9.7 &&
		size('copy-prompt-check') < 15.9,
	`${size('copy-prompt-copy')} and ${size('copy-prompt-check')}`,
);
kit.step(80);
kit.check(
	'the copy mark ends at 0.6 and the check at full size',
	near(size('copy-prompt-copy'), 9.6) && near(size('copy-prompt-check'), 16),
	`${size('copy-prompt-copy')} and ${size('copy-prompt-check')}`,
);
renderer.clockResume();

await kit.until(
	() => size('copy-prompt-copy') > 15.9,
	'the copy mark back',
	4000,
);
kit.check(
	'two seconds on the check scales back out',
	near(size('copy-prompt-check'), 9.6),
	`${size('copy-prompt-check')}`,
);
kit.finish();
