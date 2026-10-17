import { createReducedMotion, type HostElement } from '@gpuix/solid';
import { createEffect, createSignal, onCleanup, useContext } from 'solid-js';
import { PageScrollContext, PageScrollerContext } from '#/lib/cull';

/** The line a month must cross to count as the one being read: a quarter of the way down the scroller. */
const SPY_LINE = 0.25;
/** Where an anchor jump lands a section's top: the source's `xl:scroll-mt-8`. */
const SCROLL_MARGIN = 32;
const BOTTOM_SLACK = 2;

/**
 * The page and its Releases rail are siblings in `App`, so the month in view
 * and the jump to a month live here, in the one module both import. Only
 * `createReleaseSpy` writes them.
 */
const [activeMonth, setActiveMonth] = createSignal<string>();

export { activeMonth };

let jump: ((month: string) => void) | undefined;

export function scrollToMonth(month: string) {
	if (jump === undefined) {
		throw new Error('No changelog page is mounted to scroll');
	}
	jump(month);
}

/**
 * Tracks which month is in view as the page scrolls: the last whose top is
 * above the line at a quarter of the scroller's height, and the last month
 * once the scroller is at its end (the final section is too short to ever
 * reach the line). Returns the ref to put on each month's section.
 */
export function createReleaseSpy(months: readonly string[]) {
	const scroller = useContext(PageScrollerContext);
	const onPageScroll = useContext(PageScrollContext);
	if (scroller === undefined || onPageScroll === undefined) {
		throw new Error("The changelog must be inside the page's scroll contexts");
	}
	const reduced = createReducedMotion();
	const sections = new Map<string, HostElement>();

	const update = (root: HostElement) => {
		if (
			root.scrollTop + root.clientHeight >=
			root.scrollHeight - BOTTOM_SLACK
		) {
			setActiveMonth(months[months.length - 1]);
			return;
		}
		const line =
			root.getBoundingClientRect().top + root.clientHeight * SPY_LINE;
		let current = months[0];
		for (const month of months) {
			const rect = sections.get(month)?.getBoundingClientRect();
			// A section with no box is not laid out yet, so its zero top says nothing.
			if (rect !== undefined && rect.height > 0 && rect.top <= line) {
				current = month;
			}
		}
		setActiveMonth(current);
	};

	createEffect(() => {
		const root = scroller();
		if (root === undefined) return;
		update(root);
		const stop = onPageScroll(() => update(root));
		jump = (month) => {
			const section = sections.get(month);
			if (section === undefined) {
				throw new Error(`The changelog has no section for ${month}`);
			}
			root.scrollTo({
				top:
					root.scrollTop +
					section.getBoundingClientRect().top -
					root.getBoundingClientRect().top -
					SCROLL_MARGIN,
				behavior: reduced() ? 'instant' : 'smooth',
			});
		};
		onCleanup(() => {
			stop();
			jump = undefined;
		});
	});
	onCleanup(() => setActiveMonth(undefined));

	return (month: string) => (element: HostElement) => {
		sections.set(month, element);
		onCleanup(() => sections.delete(month));
	};
}
