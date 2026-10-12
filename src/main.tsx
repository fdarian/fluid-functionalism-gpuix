/**
 * Entry point. `bun --hot src/main.tsx`: no bundler, the Solid JSX transform
 * is a Bun preload (see bunfig.toml).
 */
import { render } from "@gpuix/solid";
import { App } from "./app";

render(() => <App />, {
	title: "gpuix + fluid functionalism",
	width: 1240,
	height: 780,
});
