import {
	createReducedMotion,
	type HostElement,
	IntersectionObserver,
	motion,
} from '@gpuix/solid';
import {
	type Accessor,
	children,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	useContext,
} from 'solid-js';
import { Button } from '#/components/button';
import { Select } from '#/components/select';
import { Switch } from '#/components/switch';
import { PageScrollerContext } from './cull';
import { DemoCard } from './demo-kit';
import { defineIcon } from './icons';
import { color, type as scale, motion as tween, weight } from './theme';

// Shared scaffolding for page playgrounds: the control rows, the muted panel
// with its shuffle header, and the layout that keeps the preview in the page
// column while its controls sit in the right column under "Make them yours".

// ─── The right-rail slot ─────────────────────────────────────────────────────

export type RightRail = {
	/** What the right column shows under the customise card. */
	content: Accessor<JSX.Element>;
	mount: (content: JSX.Element) => void;
	/** Clears the slot only while `content` is still the one in it, so a page that mounts before the old one's cleanup runs keeps its own. */
	unmount: (content: JSX.Element) => void;
};

export function createRightRail(): RightRail {
	const [content, setContent] = createSignal<JSX.Element>();
	return {
		content,
		mount: (next) => setContent(() => next),
		unmount: (previous) => {
			if (content() === previous) setContent(undefined);
		},
	};
}

export const RightRailContext = createContext<RightRail>();

function useRightRail(): RightRail {
	const rail = useContext(RightRailContext);
	if (rail === undefined) {
		throw new Error("A playground must be inside <App>'s RightRailContext");
	}
	return rail;
}

/** Rendered by the right column; shows whatever a page mounted into the rail. */
export function RightRailTarget() {
	const rail = useRightRail();
	return <>{rail.content()}</>;
}

// ─── Control rows ────────────────────────────────────────────────────────────

/** A random element, for a panel's shuffle. */
export function pick<T>(options: readonly T[]): T {
	return options[Math.floor(Math.random() * options.length)];
}

/** A labelled row: the name at the left, its control at the right. `disabled` dims it and drops pointer events. */
export function PlayField(props: {
	label: string;
	children: JSX.Element;
	disabled?: boolean;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				height: 36,
				paddingLeft: 4,
				paddingRight: 4,
				opacity: props.disabled === true ? 0.4 : 1,
				pointerEvents: props.disabled === true ? 'none' : 'auto',
			}}
		>
			<text style={{ ...scale.body, color: color.mutedForeground }}>
				{props.label}
			</text>
			{props.children}
		</div>
	);
}

/** The borderless select of a `PlayField`. */
export function PlaySelect<Value extends string>(props: {
	value: Value;
	onChange: (value: Value) => void;
	options: readonly { value: Value; label: string }[];
	testId?: string;
}) {
	return (
		<Select
			testId={props.testId}
			items={props.options}
			value={props.value}
			onValueChange={props.onChange}
		/>
	);
}

/** A switch laid out as a settings row. */
export function PlaySwitch(props: {
	label: string;
	checked: boolean;
	onToggle: () => void;
	disabled?: boolean;
	testId?: string;
}) {
	return (
		<Switch
			settingsRow
			label={props.label}
			checked={props.checked}
			onToggle={props.onToggle}
			disabled={props.disabled}
			testId={props.testId}
		/>
	);
}

/** A heading inside a panel: full contrast at the rows' size, so it reads as a title of the list. */
export function PlaySection(props: { label: string }) {
	return (
		<div
			style={{
				paddingLeft: 4,
				paddingRight: 4,
				paddingTop: 8,
				paddingBottom: 4,
			}}
		>
			<text
				style={{
					...scale.body,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				{props.label}
			</text>
		</div>
	);
}

/** A hairline between two control groups, bleeding across the panel's padding. */
export function PlayDivider() {
	return (
		<div
			style={{
				height: 1,
				marginTop: 8,
				marginBottom: 8,
				marginLeft: -12,
				marginRight: -12,
				backgroundColor: color.borderFaint,
			}}
		/>
	);
}

const SHUFFLE = defineIcon(
	'<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
);

/** The muted controls card: a title row with a shuffle button, the rows below. */
export function PlaygroundPanel(props: {
	title?: string;
	onShuffle: () => void;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				padding: 12,
				borderRadius: 12,
				backgroundColor: color.surface2,
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingLeft: 4,
					paddingRight: 4,
					paddingTop: 4,
					paddingBottom: 8,
				}}
			>
				<text
					style={{
						...scale.title,
						lineHeight: `${scale.title.fontSize}px`,
						fontWeight: weight.semibold,
						color: color.foreground,
					}}
				>
					{props.title ?? 'Playground variant'}
				</text>
				<Button
					testId="playground-shuffle"
					variant="ghost"
					size="icon-compact"
					icon={SHUFFLE}
					aria-label="Randomize properties"
					onClick={props.onShuffle}
				/>
			</div>
			{props.children}
		</div>
	);
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/** The preview's frame is at least this tall, as the doc page's `ComponentPreview` is. */
const PREVIEW_MIN_HEIGHT = 420;
/** `rootMargin: "0px 0px -20% 0px"`: the controls fade once the preview's top is in the scroller's last fifth. */
const VISIBLE_MARGIN = '0px 0px -20% 0px';

/**
 * The preview in the page column, in the same frame as a demo card, and its
 * controls in the right column while the page is open. The controls fade out,
 * and stop taking the pointer, while the preview is out of the page scroller's
 * view.
 */
export function PlaygroundLayout(props: {
	preview: JSX.Element;
	controls: JSX.Element;
	/** Pinned to the bottom centre of the preview, e.g. a "Show banner" button once its banner is dismissed. */
	overlay?: JSX.Element;
	minHeight?: number;
}) {
	const rail = useRightRail();
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"PlaygroundLayout must be inside the page's PageScrollerContext",
		);
	}
	const [inView, setInView] = createSignal(true);
	const reduced = createReducedMotion();
	let frame: HostElement | undefined;

	createEffect(() => {
		const root = scroller();
		if (root === undefined || frame === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => {
				setInView(entries[entries.length - 1].isIntersecting);
			},
			{ root, rootMargin: VISIBLE_MARGIN },
		);
		observer.observe(frame);
		onCleanup(() => observer.disconnect());
	});

	// Resolved here, so the controls are built under this component's owner and keep its contexts.
	const controls = children(() => props.controls);
	const railControls = (
		<motion.div
			initial={false}
			animate={{ opacity: inView() ? 1 : 0 }}
			transition={reduced() ? tween.snap : tween.moderate}
			style={{ pointerEvents: inView() ? 'auto' : 'none' }}
		>
			{controls()}
		</motion.div>
	);
	createEffect(() => {
		rail.mount(railControls);
		onCleanup(() => rail.unmount(railControls));
	});

	return (
		<div
			ref={(element) => {
				frame = element;
			}}
		>
			<DemoCard title="Playground">
				<div
					style={{
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						minHeight: props.minHeight ?? PREVIEW_MIN_HEIGHT,
					}}
				>
					{props.preview}
					{props.overlay === undefined ? null : (
						<div
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								bottom: 0,
								display: 'flex',
								flexDirection: 'row',
								justifyContent: 'center',
							}}
						>
							{props.overlay}
						</div>
					)}
				</div>
			</DemoCard>
		</div>
	);
}
