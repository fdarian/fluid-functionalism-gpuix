/**
 * Entry point. `bun --hot src/main.tsx`: no bundler, the Solid JSX transform
 * is a Bun preload (see bunfig.toml). Demos in `src/demos/` are discovered at
 * startup, so a new one shows up after a restart.
 */
import { render } from "@gpuix/solid";
import { App, WINDOW_TITLE } from "./app";
import { loadDemos, loadPages } from "#/lib/demo";
import { fonts } from "#/lib/fonts";

const demos = await loadDemos();
const pages = await loadPages(demos);

render(() => <App demos={demos} pages={pages} />, {
	title: WINDOW_TITLE,
	titlebarTransparent: true,
	trafficLightX: 14,
	trafficLightY: 13,
	width: 1240,
	height: 780,
	fonts,
});
