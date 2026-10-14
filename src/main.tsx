/**
 * Entry point. `bun --hot src/main.tsx`: no bundler, the Solid JSX transform
 * is a Bun preload (see bunfig.toml). Demos in `src/demos/` are discovered at
 * startup, so a new one shows up after a restart.
 */
import { render } from "@gpuix/solid";
import { App } from "./app";
import { loadDemos } from "./lib/demo";
import { fonts } from "./lib/fonts";

const demos = await loadDemos();

render(() => <App demos={demos} />, {
	title: "gpuix + fluid functionalism",
	width: 1240,
	height: 780,
	fonts,
});
