import {
	createReducedMotion,
	type HostElement,
	IntersectionObserver,
} from '@ghia/solid';
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from 'solid-js';
import { Button } from '#/components/button';
import { Tooltip } from '#/components/tooltip';
import { BentoTileContext, bentoFrame } from '#/home/bento-card';
import { PageScrollerContext } from '#/lib/cull';
import { PAUSE_ICON, PLAY_ICON } from '#/lib/playback-icons';
import { PreviewPlaybackContext } from '#/lib/preview-playback';
import { fade, shape, sizeChoice } from '#/lib/theme';
import {
	ANIMATED_PREVIEWS,
	DEFAULT_STAGE_PADDING,
	previewFor,
	STAGE_PADDING,
} from './previews';

/** A stage mounts its preview once it is this close to the viewport, so the preview is ready by the time it scrolls in. */
const MOUNT_MARGIN = '600px 0px';
/** How much of a stage must be on screen for its animation to play. */
const IN_VIEW_RATIO = 0.35;
const STAGE_MIN_HEIGHT = 260;
const BUTTON_INSET = 8;

interface PagePlayback {
	paused: Accessor<boolean>;
	setPaused: (paused: boolean) => void;
}

const PagePlaybackContext = createContext<PagePlayback>();

/**
 * One pause for the whole page: previews play as they scroll into view until
 * the visitor pauses any of them, which pauses them all; Play on any one
 * resumes them all. Reduced motion starts the page paused.
 */
export function PagePlaybackProvider(props: { children: JSX.Element }) {
	const reduced = createReducedMotion();
	const [chosen, setChosen] = createSignal<boolean>();
	const playback: PagePlayback = {
		paused: () => chosen() ?? reduced(),
		setPaused: setChosen,
	};
	return (
		<PagePlaybackContext.Provider value={playback}>
			{props.children}
		</PagePlaybackContext.Provider>
	);
}

function usePagePlayback(): PagePlayback {
	const playback = useContext(PagePlaybackContext);
	if (playback === undefined) {
		throw new Error('A preview stage must be inside a PagePlaybackProvider');
	}
	return playback;
}

interface Crossing {
	isIntersecting: boolean;
	intersectionRatio: number;
}

/** Reports the latest crossing of `element` over the scroller's viewport grown by `margin`, at each of `thresholds`. */
function observe(
	scroller: Accessor<HostElement | undefined>,
	element: Accessor<HostElement | undefined>,
	options: { margin: string; thresholds: number[] },
	onCrossing: (crossing: Crossing) => void,
) {
	createEffect(() => {
		const root = scroller();
		const target = element();
		if (root === undefined || target === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest !== undefined) onCrossing(latest);
			},
			{
				root,
				rootMargin: options.margin,
				threshold: options.thresholds,
			},
		);
		observer.observe(target);
		onCleanup(() => observer.disconnect());
	});
}

function PlayPauseButton(props: { slug: string }) {
	const playback = usePagePlayback();
	const label = () =>
		playback.paused() ? 'Play all previews' : 'Pause all previews';
	return (
		<div
			style={{
				position: 'absolute',
				top: BUTTON_INSET,
				right: BUTTON_INSET,
				zIndex: 10,
			}}
		>
			<Tooltip content={label()} side="top">
				<Button
					testId={`changelog-playback-${props.slug}`}
					variant="ghost"
					size={sizeChoice() === 'compact' ? 'icon-compact' : 'icon'}
					icon={playback.paused() ? PLAY_ICON : PAUSE_ICON}
					aria-label={label()}
					onClick={() => playback.setPaused(!playback.paused())}
				/>
			</Tooltip>
		</div>
	);
}

/**
 * The bordered stage under a New entry: its live preview, centred, mounted
 * once the stage nears the viewport. An animated preview plays only while the
 * stage is on screen and the page is not paused.
 */
export function PreviewStage(props: { slug: string }): JSX.Element {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"A preview stage must be inside the page's PageScrollerContext",
		);
	}
	const playback = usePagePlayback();
	const [stage, setStage] = createSignal<HostElement>();
	const [near, setNear] = createSignal(false);
	const [inView, setInView] = createSignal(false);
	observe(
		scroller,
		stage,
		{ margin: MOUNT_MARGIN, thresholds: [0] },
		(crossing) => {
			if (crossing.isIntersecting) setNear(true);
		},
	);
	observe(
		scroller,
		stage,
		{ margin: '0px', thresholds: [0, IN_VIEW_RATIO] },
		(crossing) => setInView(crossing.intersectionRatio >= IN_VIEW_RATIO),
	);

	const padding = () => STAGE_PADDING[props.slug] ?? DEFAULT_STAGE_PADDING;
	const playing = () => inView() && !playback.paused();

	return (
		<div
			ref={setStage}
			testId={`changelog-stage-${props.slug}`}
			style={{
				position: 'relative',
				marginTop: 12,
				overflow: 'hidden',
				borderStyle: 'solid',
				borderWidth: 1,
				borderRadius: shape.container,
				...bentoFrame('rest'),
				...fade(['border-color'], 80),
				hover: bentoFrame('hover'),
				focusWithin: bentoFrame('focus'),
			}}
		>
			<Show when={ANIMATED_PREVIEWS.has(props.slug)}>
				<PlayPauseButton slug={props.slug} />
			</Show>
			{/* The tile context trims previews built for the Showcase to its 300px rows. */}
			<BentoTileContext.Provider value={true}>
				<PreviewPlaybackContext.Provider value={playing}>
					<div
						style={{
							minHeight: STAGE_MIN_HEIGHT,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							paddingLeft: padding().x,
							paddingRight: padding().x,
							paddingTop: padding().y,
							paddingBottom: padding().y,
						}}
					>
						<Show when={near()}>
							<Preview slug={props.slug} />
						</Show>
					</div>
				</PreviewPlaybackContext.Provider>
			</BentoTileContext.Provider>
		</div>
	);
}

function Preview(props: { slug: string }): JSX.Element {
	const Component = previewFor(props.slug);
	if (Component === undefined) {
		throw new Error(`No changelog preview for ${props.slug}`);
	}
	return <Component />;
}
