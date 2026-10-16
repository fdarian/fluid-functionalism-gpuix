# command-menu

Original: `registry/default/command-menu.tsx`. Ported in `src/components/command-menu.tsx`, demo in `src/demos/command-menu.tsx`.

## Clipped rows are still laid out and painted

- **Original:** a browser skips paint for content a scroller clips away, and `content-visibility: auto` skips layout too, so a page of eight menus costs about what one does.
- **gpuix lacks:** culling. Every element, including rows and cards outside a scroller's viewport, is built, laid out and painted each frame. Only `<virtual-list>` skips them (`~/code/fdarian/gpuix/README.md` "Performance model"). The command-menu page has about 1,400 elements and 800 text runs, which cost 57 ms of CPU a frame (18 ms in the native draw) against 10 ms (3.6 ms) on the dropdown page; the 80 ms highlight spring got one or two frames, so it read as a jump, and a wheel tick cost 110 to 135 ms.
- **Workaround:** `DemoCard` (`src/lib/demo-kit.tsx`) watches its content with an `IntersectionObserver` rooted at the page scroller and, once the card is more than a quarter of the scroller away, sets its content to `display: none` (no box is built for it or anything inside) and pins the height it had. The card stays mounted, so typed text and tabs survive a scroll away and back. This brought the frame to 20 ms (6.6 ms native). A `<virtual-list>` page was not used: it needs each card as a direct child of the list, which no demo's markup is, and the scenario helper `reveal()` reads bounds a row outside the window does not have. The menu's own list is not virtualised either: the highlight lives inside the scrolled content and fluid hover measures every row, so a menu's 15 clipped rows still cost a few ms each.
- **Fidelity:** approximated (same output, a hitch of a frame or two when a card far from the scroller is jumped to).
- **Components it hits:** any long page or list; the other demo pages gain the same card hiding.
