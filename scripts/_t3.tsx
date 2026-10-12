import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const t = createTestRoot({ width: 1100, height: 720 });
const r = t.renderer;
t.render(() => <App />);
await sleep(300); r.flush(); r.getElementBounds(1); await sleep(300); r.flush();
const settle = async (ms = 300) => { await sleep(ms); r.flush(); };
r.simulateKeystrokes("tab"); await settle(); r.simulateKeystrokes("escape"); await settle();
for (let i = 0; i < 3; i++) { r.simulateKeystrokes("tab"); await settle(150); }
r.captureScreenshot("/tmp/f1.png");
console.log(r.getFocusedElementId());
process.exit(0);
