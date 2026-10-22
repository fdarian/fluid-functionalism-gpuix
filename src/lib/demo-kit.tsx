import type { JSX } from 'solid-js';
import { createCulling, OnScreenContext } from './cull';
import type { ShotContext } from './demo';
import { color, type as scale } from './theme';

/** The bordered surface a demo page is made of: content on top, the component's name in a footer, like the site's showcase cards. */
export function DemoCard(props: { title: string; children: JSX.Element }) {
	const culling = createCulling();

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				borderRadius: 12,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.surface2,
			}}
		>
			<div
				ref={culling.ref}
				style={{
					padding: 20,
					...culling.style(),
				}}
			>
				<OnScreenContext.Provider value={culling.onScreen}>
					{props.children}
				</OnScreenContext.Provider>
			</div>
			<div
				style={{
					height: 44,
					display: 'flex',
					alignItems: 'center',
					paddingLeft: 16,
					borderTopStyle: 'solid',
					borderTopWidth: 1,
					borderColor: color.border,
				}}
			>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					{props.title}
				</text>
			</div>
		</div>
	);
}

/** A caption on the left, controls on the right. */
export function DemoRow(props: { label: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 16,
				minHeight: 36,
			}}
		>
			<div style={{ width: 96, flexShrink: 0 }}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{props.label}
				</text>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 10,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}

/** Scrolls the page until the element sits in its upper part, where a popup below it has room, unless the page ends first. */
export async function scrollNearTop(shot: ShotContext, testId: string) {
	await shot.reveal(testId);
	let stalled = 0;
	for (let attempt = 0; attempt < 12; attempt++) {
		const y = shot.centerOf(testId).y;
		if (y > 120 && y < 320) return;
		const wheel = await shot.scroll(700, 400, 0, y - 200);
		if (wheel.atEnd) return;
		// A wheel can land without moving the page: a third miss in a row is an error.
		stalled = wheel.moved ? 0 : stalled + 1;
		if (stalled === 3) throw new Error(`scrolling did not move ${testId}`);
	}
	throw new Error(`could not scroll ${testId} into view`);
}
