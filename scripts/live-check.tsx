/**
 * Drives the real window (not the offscreen renderer) through gpuix's
 * automation client, to check that painted bounds and fluid hover also work
 * in a live GPUI app. `bun scripts/live-check.tsx`
 */
import { launch } from '@ghia/solid/automation';

const outDir = new URL('../screenshots/live/', import.meta.url).pathname;
const root = new URL('..', import.meta.url).pathname;

const app = await launch({
	command: 'bun',
	args: ['src/main.tsx'],
	cwd: root,
	env: { GPUIX_BACKGROUND: '1' },
});

// A hung launch must not leave the window process behind.
const watchdog = setTimeout(async () => {
	console.error('live-check: watchdog fired');
	await app.close();
	process.exit(2);
}, 120_000);

try {
	await app.getByTestId('nav-combobox').waitFor({ timeoutMs: 30_000 });
	await app.getByTestId('nav-combobox').click();
	await new Promise((resolve) => setTimeout(resolve, 600));
	await app.getByTestId('nav-button').hover();
	await new Promise((resolve) => setTimeout(resolve, 500));
	await app.screenshot({ path: `${outDir}live-sidebar-hover.png` });
	await app.getByTestId('framework-input').click();
	await new Promise((resolve) => setTimeout(resolve, 800));
	await app.screenshot({ path: `${outDir}live-combobox-open.png` });
	console.log('live-check: ok');
} finally {
	await app.close();
	clearTimeout(watchdog);
}
