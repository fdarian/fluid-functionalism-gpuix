# app-frame

Original: none. fluidfunctionalism.com is a web page; the browser supplies the window chrome. This is the port's own browser-style frame, in `src/lib/app-frame.tsx` and the `render()` options in `src/main.tsx`.

## The test renderer ignores window options and appearance

- **Original:** n/a, this is about the harness.
- **gpuix lacks:** `createTestRoot` accepts `titlebarTransparent`, `trafficLightX` / `trafficLightY` and `setAppearance` but does nothing with them. The offscreen window has no traffic lights, and `setAppearance` neither changes `getAppearance()` nor fires `appearanceChange`, because the window never receives a system change (`packages/native/src/test_renderer.rs:836-847`, `packages/native/js/testing.ts:903-908`).
- **Workaround:** the screenshots pin the theme with `setThemeChoice("dark")` before rendering and flip it through the real control for the light capture (`scripts/screenshots.tsx:201`, `:211-221`). The traffic-light inset follows only in the real window (`src/main.tsx:13-21`).
- **Fidelity:** approximated (captures show the frame without the traffic lights).
- **Components it hits:** every demo capture.
