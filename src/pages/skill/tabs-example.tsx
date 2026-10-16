import { buttonProps, useGpuixRequired } from '@gpuix/solid';
import { createSignal, For } from 'solid-js';
import { TabsSubtle, TabsSubtleItem } from '#/components/tabs-subtle';
import { color, focusRing, shape, siteType, weight } from '#/lib/theme';
import {
	Compare,
	clickStep,
	createLoop,
	createPlayback,
	createScriptCursor,
	type Side,
	turns,
} from './playback';

const TABS = ['Overview', 'Activity', 'Settings'];

/**
 * Generic subtle tabs: bold on the active tab widens it and shoves its
 * neighbors; the active pill jumps instead of sliding, and each tab paints
 * its own hover.
 */
function GenericTabs(props: {
	selected: number;
	onSelect: (index: number) => void;
}) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal<number>();
	return (
		<div role="tablist" style={{ display: 'flex', flexDirection: 'row' }}>
			<For each={TABS}>
				{(label, index) => (
					<div
						{...buttonProps(
							{ onClick: () => props.onSelect(index()) },
							renderer,
						)}
						role="tab"
						aria-selected={props.selected === index()}
						testId={`tabs-generic-tab-${index()}`}
						onMouseEnter={() => setHovered(index())}
						onMouseLeave={() => setHovered(undefined)}
						style={{
							height: 36,
							paddingLeft: 12,
							paddingRight: 12,
							display: 'flex',
							alignItems: 'center',
							flexShrink: 0,
							borderRadius: shape.bg,
							cursor: 'pointer',
							keyboardFocusDim: false,
							backgroundColor:
								props.selected === index()
									? color.muted
									: hovered() === index()
										? color.mutedHalf
										: color.transparent,
							focusVisible: focusRing(0),
						}}
					>
						<text
							style={{
								...siteType.body,
								// The generic version, bold on purpose to show the reflow.
								fontWeight: props.selected === index() ? 700 : weight.normal,
								color:
									props.selected === index()
										? color.foreground
										: color.mutedForeground,
								whiteSpace: 'nowrap',
							}}
						>
							{label}
						</text>
					</div>
				)}
			</For>
		</div>
	);
}

export function TabsExample() {
	const playback = createPlayback();
	const cursor = createScriptCursor(playback);
	const [generic, setGeneric] = createSignal(0);
	const [skill, setSkill] = createSignal(0);
	const [active, setActive] = createSignal<Side | null>(null);
	const select = (side: Side) => (side === 'generic' ? setGeneric : setSkill);
	const tab = (side: Side, index: number) => `tabs-${side}-tab-${index}`;
	createLoop(
		playback.playing,
		turns(setActive, (side) => [
			...clickStep(cursor, tab(side, 1), () => select(side)(1), 700),
			...clickStep(cursor, tab(side, 2), () => select(side)(2), 700),
			...clickStep(cursor, tab(side, 0), () => select(side)(0), 900),
		]),
	);

	return (
		<Compare
			playback={playback}
			cursor={cursor}
			active={playback.playing() ? active() : null}
			generic={<GenericTabs selected={generic()} onSelect={setGeneric} />}
			skill={
				// TabsSubtle aligns itself to the start of its parent's cross axis, so the frame's centering needs a box of its own.
				<div style={{ display: 'flex' }}>
					<TabsSubtle selectedIndex={skill()} onSelect={setSkill}>
						<For each={TABS}>
							{(label, index) => (
								<TabsSubtleItem
									index={index()}
									label={label}
									testId={tab('skill', index())}
								/>
							)}
						</For>
					</TabsSubtle>
				</div>
			}
		/>
	);
}
