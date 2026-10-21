import { WINDOW_TITLE } from '#/app';
import { fonts } from '#/lib/fonts';

/** What `src/main.tsx` opens the window with; `scripts/footprint-child.tsx --window` measures the same window. */
export const windowOptions = {
	title: WINDOW_TITLE,
	titlebarTransparent: true,
	trafficLightX: 14,
	trafficLightY: 13,
	width: 1240,
	height: 780,
	focus: process.env.GPUIX_BACKGROUND !== '1',
	fonts,
};
