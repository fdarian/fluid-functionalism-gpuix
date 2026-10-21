import { type Display, screen } from '@gpuix/solid';
import { WINDOW_TITLE } from '#/app';
import { fonts } from '#/lib/fonts';

const WINDOW_WIDTH = 1240;
const WINDOW_HEIGHT = 780;

function describeDisplays(displays: Display[], primary: Display) {
	return displays
		.map((display, index) => {
			const area = display.workArea;
			const role = display.id === primary.id ? ' (primary)' : '';
			return `  ${index}: id ${display.id}, workArea ${area.x},${area.y} ${area.width}x${area.height}${role}`;
		})
		.join('\n');
}

function chooseDisplay(displays: Display[], primary: Display) {
	const requested = process.env.FF_DISPLAY;
	if (requested === undefined) {
		return displays.find((display) => display.id !== primary.id);
	}
	const index = Number(requested);
	if (!/^\d+$/.test(requested) || index >= displays.length) {
		throw new Error(
			`FF_DISPLAY=${requested} is not a display index. Displays:\n${describeDisplays(displays, primary)}`,
		);
	}
	return displays[index];
}

/** Centres a width x height window in a display's work area: `FF_DISPLAY=<index>` (order of `getAllDisplays()`), else the first non-primary display, else `{}` so gpuix centres it. */
export function windowPlacement(width: number, height: number) {
	const target = chooseDisplay(
		screen.getAllDisplays(),
		screen.getPrimaryDisplay(),
	);
	if (target === undefined) return {};
	return {
		x: target.workArea.x + (target.workArea.width - width) / 2,
		y: target.workArea.y + (target.workArea.height - height) / 2,
	};
}

/** What `src/main.tsx` opens the window with; `scripts/footprint-child.tsx --window` measures the same window. */
export const windowOptions = {
	title: WINDOW_TITLE,
	titlebarTransparent: true,
	trafficLightX: 14,
	trafficLightY: 13,
	width: WINDOW_WIDTH,
	height: WINDOW_HEIGHT,
	...windowPlacement(WINDOW_WIDTH, WINDOW_HEIGHT),
	focus: process.env.GPUIX_BACKGROUND !== '1',
	fonts,
};
