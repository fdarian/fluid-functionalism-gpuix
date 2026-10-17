import {
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	untrack,
} from 'solid-js';
import { Button } from '#/components/button';
import {
	type StepStatus,
	ThinkingStep,
	ThinkingStepDetails,
	ThinkingStepImage,
	ThinkingStepSource,
	ThinkingStepSources,
	ThinkingSteps,
	ThinkingStepsContent,
	ThinkingStepsHeader,
} from '#/components/thinking-steps';
import { useOnScreen } from '#/lib/cull';
import type { DemoModule, ShotContext } from '#/lib/demo';
import { DemoCard } from '#/lib/demo-kit';

const ogImage = new URL('../../assets/chat-ai/og.png', import.meta.url)
	.pathname;

type Playback = 'playing' | 'paused' | 'finished';

/**
 * The docs page's `useSequencedSteps`: fires `delays` (absolute ms from the
 * start) in order, and a pause keeps the elapsed time so play resumes where it
 * stopped. The page starts it when half the card is in view; gpuix has no
 * IntersectionObserver, so these start on mount.
 */
function createSequence(delays: number[]) {
	const [fired, setFired] = createSignal(0);
	const [playback, setPlayback] = createSignal<Playback>('playing');
	let elapsed = 0;
	let startedAt = performance.now();
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));

	const schedule = () => {
		clearTimeout(timer);
		if (fired() >= delays.length) return;
		startedAt = performance.now();
		const target = delays[fired()];
		timer = setTimeout(
			() => {
				elapsed = target;
				const next = fired() + 1;
				setFired(next);
				if (next >= delays.length) setPlayback('finished');
				else schedule();
			},
			Math.max(0, target - elapsed),
		);
	};
	schedule();

	return {
		fired,
		playback,
		/** Play / pause, or start over once finished. */
		toggle() {
			if (playback() === 'playing') {
				clearTimeout(timer);
				elapsed += performance.now() - startedAt;
				setPlayback('paused');
			} else if (playback() === 'paused') {
				setPlayback('playing');
				schedule();
			} else {
				elapsed = 0;
				setFired(0);
				setPlayback('playing');
				schedule();
			}
		},
		status(index: number, total: number): StepStatus {
			if (fired() >= total) return 'complete';
			if (index < fired() - 1) return 'complete';
			return index === fired() - 1 ? 'active' : 'pending';
		},
	};
}

/** A card that owns one sequence and a play / pause / replay button; `run` remounts the steps when the sequence restarts. */
function PlaybackCard(props: {
	title: string;
	id: string;
	delays: number[];
	children: (sequence: ReturnType<typeof createSequence>) => JSX.Element;
}) {
	const sequence = createSequence(props.delays);
	const [run, setRun] = createSignal(0);
	const label = () =>
		sequence.playback() === 'playing'
			? 'Pause'
			: sequence.playback() === 'paused'
				? 'Play'
				: 'Replay';
	return (
		<DemoCard title={props.title}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'flex-end',
					}}
				>
					<Button
						testId={`${props.id}-playback`}
						variant="ghost"
						size="compact"
						onClick={() => {
							if (sequence.playback() === 'finished') setRun(run() + 1);
							sequence.toggle();
						}}
					>
						{label()}
					</Button>
				</div>
				<For each={[run()]}>{() => props.children(sequence)}</For>
			</div>
		</DemoCard>
	);
}

function BasicDemo() {
	return (
		<ThinkingSteps testId="basic">
			<ThinkingStepsHeader testId="basic-header" />
			<ThinkingStepsContent testId="basic-panel">
				<ThinkingStep icon="search" label="Searched the web" />
				<ThinkingStep icon="globe" label="Read 3 sources">
					<ThinkingStepDetails
						testId="basic-details"
						summary="Explored 6 files"
						details={[
							'Read accordion.tsx',
							'Read icon-context.tsx',
							'Read badge.tsx',
							'Read use-fluid-hover.ts',
							'Read components.ts',
							'Read postbuild-registry.mjs',
						]}
					/>
				</ThinkingStep>
				<ThinkingStep icon="check" label="Done" isLast />
			</ThinkingStepsContent>
		</ThinkingSteps>
	);
}

function MinimalDemo() {
	return (
		<ThinkingSteps>
			<ThinkingStepsHeader />
			<ThinkingStepsContent>
				<ThinkingStep showIcon={false} label="Ran a command" />
				<ThinkingStep showIcon={false} label="Done" isLast />
			</ThinkingStepsContent>
		</ThinkingSteps>
	);
}

function StreamingDemo(props: { sequence: ReturnType<typeof createSequence> }) {
	const TOTAL = 5;
	const [open, setOpen] = createSignal(true);
	const fired = props.sequence.fired;
	const status = (index: number) => props.sequence.status(index, TOTAL);
	return (
		<ThinkingSteps testId="streaming" open={open()} onOpenChange={setOpen}>
			<ThinkingStepsHeader testId="streaming-header" />
			<ThinkingStepsContent>
				<ThinkingStep
					icon="search"
					label="Searching for micka.design"
					status={status(0)}
					isLast={fired() <= 1}
				>
					<Show when={fired() > 1}>
						<ThinkingStepSources>
							<ThinkingStepSource delay={0.05}>x.com</ThinkingStepSource>
							<ThinkingStepSource delay={0.1}>google.com</ThinkingStepSource>
							<ThinkingStepSource delay={0.15}>github.com</ThinkingStepSource>
						</ThinkingStepSources>
					</Show>
				</ThinkingStep>
				<ThinkingStep
					icon="globe"
					label="Reading sources"
					status={status(1)}
					isLast={fired() <= 2}
				/>
				<ThinkingStep
					icon="brain"
					label="Analyzing portfolio"
					status={status(2)}
					isLast={fired() <= 3}
				/>
				<ThinkingStep icon="check" label="Complete" status={status(3)} isLast />
			</ThinkingStepsContent>
		</ThinkingSteps>
	);
}

const STREAMING_TEXT = [
	'Establishing a connection to the data warehouse and streaming 2.4 million rows across 47 columns into a memory-mapped buffer. The source table spans three partitions dated from January through March, each containing roughly 800K records with nested JSON fields that need to be flattened before downstream processing can begin.',
	'Running a full schema validation pass against the canonical type definitions. Checking that all 47 columns match their expected types, verifying nullability constraints on the 12 required fields, confirming foreign key references resolve correctly against the dimension tables, and flagging any new columns that appeared since the last successful run on March 15th.',
	'Applying the full normalization pipeline: flattening nested address objects into discrete columns, deduplicating records that share the same composite key across partitions, converting all timestamps from mixed UTC and local offsets into a canonical ISO 8601 format, and running the currency conversion step for the 14 non-USD transaction currencies using the daily exchange rate snapshot.',
	"Executing 23 data quality assertions: verifying that output row counts fall within the expected 2% tolerance of the source, checking that the revenue distribution skew hasn't shifted beyond 1.5 standard deviations from the trailing 30-day average, confirming referential integrity against all five dimension tables, and ensuring that no single partition exceeds 40% of total volume which would indicate an upstream ingestion anomaly.",
	'Compressing the validated dataset into 847 Snappy-encoded Parquet files partitioned by region and date, uploading each file to the staging bucket with server-side encryption enabled, registering the new partition metadata in the Hive metastore, and triggering the downstream Airflow DAG that handles incremental merges into the production fact table.',
];
const STREAMING_LABELS = [
	'Loading dataset',
	'Validating schema',
	'Transforming records',
	'Running quality checks',
	'Writing output',
];

/** Types `text` in three characters at a time while `active`, like the docs' `useStreamingText`. */
function createStreamingText(
	text: string,
	active: () => boolean,
	done: () => boolean,
) {
	const onScreen = useOnScreen();
	const [count, setCount] = createSignal(0);
	// Typing is a timer, not `onFrame`: it advances by characters per tick, not by elapsed time.
	createEffect(() => {
		if (!active() || !onScreen() || untrack(count) >= text.length) return;
		const timer = setInterval(() => {
			const next = Math.min(count() + 3, text.length);
			setCount(next);
			if (next >= text.length) clearInterval(timer);
		}, 16);
		onCleanup(() => clearInterval(timer));
	});
	return () => {
		const shown = done() ? text : text.slice(0, count());
		return shown === '' ? undefined : shown;
	};
}

/** One step of the streaming-text card: its description is the typed text, so the step sees it change. */
function StreamingTextStep(props: {
	label: string;
	text: string;
	status: StepStatus;
	isLast: boolean;
}) {
	const description = createStreamingText(
		props.text,
		() => props.status === 'active',
		() => props.status === 'complete',
	);
	return (
		<ThinkingStep
			showIcon={false}
			label={props.label}
			description={description()}
			status={props.status}
			isLast={props.isLast}
		/>
	);
}

function StreamingTextDemo(props: {
	sequence: ReturnType<typeof createSequence>;
}) {
	const TOTAL = 7;
	const [open, setOpen] = createSignal(true);
	const fired = props.sequence.fired;
	const status = (index: number) => props.sequence.status(index, TOTAL);
	return (
		<ThinkingSteps
			testId="text"
			open={open()}
			onOpenChange={setOpen}
			width="100%"
		>
			<ThinkingStepsHeader />
			<ThinkingStepsContent>
				<For each={STREAMING_LABELS}>
					{(label, index) => (
						<StreamingTextStep
							label={label}
							text={STREAMING_TEXT[index()]}
							status={status(index())}
							isLast={fired() <= index() + 1}
						/>
					)}
				</For>
				<ThinkingStep
					showIcon={false}
					label="Pipeline complete"
					status={status(5)}
					isLast
				/>
			</ThinkingStepsContent>
		</ThinkingSteps>
	);
}

function WithImagesDemo(props: {
	sequence: ReturnType<typeof createSequence>;
}) {
	const TOTAL = 5;
	const [open, setOpen] = createSignal(true);
	const fired = props.sequence.fired;
	const status = (index: number) => props.sequence.status(index, TOTAL);
	return (
		<ThinkingSteps testId="images" open={open()} onOpenChange={setOpen}>
			<ThinkingStepsHeader>Vision Agent</ThinkingStepsHeader>
			<ThinkingStepsContent>
				<ThinkingStep
					icon="search"
					label="Searching for reference"
					status={status(0)}
					isLast={fired() <= 1}
				/>
				<ThinkingStep
					icon="image"
					label="Found screenshot"
					status={status(1)}
					isLast={fired() <= 2}
				>
					<Show when={fired() > 2}>
						<ThinkingStepImage src={ogImage} caption="Homepage screenshot" />
					</Show>
				</ThinkingStep>
				<ThinkingStep
					icon="brain"
					label="Analyzing layout"
					description="Inspecting spacing, typography scale, and color usage."
					status={status(2)}
					isLast={fired() <= 3}
				/>
				<ThinkingStep
					icon="check"
					label="Analysis complete"
					status={status(3)}
					isLast
				/>
			</ThinkingStepsContent>
		</ThinkingSteps>
	);
}

function FullDemo(props: { sequence: ReturnType<typeof createSequence> }) {
	const TOTAL = 7;
	const [open, setOpen] = createSignal(true);
	const fired = props.sequence.fired;
	const status = (index: number) => props.sequence.status(index, TOTAL);
	return (
		<ThinkingSteps testId="full" open={open()} onOpenChange={setOpen}>
			<ThinkingStepsHeader>Research Agent</ThinkingStepsHeader>
			<ThinkingStepsContent>
				<ThinkingStep
					icon="search"
					label="Searching for profiles"
					status={status(0)}
					isLast={fired() <= 1}
				>
					<Show when={fired() > 1}>
						<ThinkingStepSources>
							<ThinkingStepSource delay={0.05}>x.com</ThinkingStepSource>
							<ThinkingStepSource delay={0.1}>instagram.com</ThinkingStepSource>
							<ThinkingStepSource delay={0.15}>github.com</ThinkingStepSource>
						</ThinkingStepSources>
					</Show>
				</ThinkingStep>
				<ThinkingStep
					icon="image"
					label="Found profile photo"
					description="micka.design profile from x.com"
					status={status(1)}
					isLast={fired() <= 2}
				>
					<Show when={fired() > 2}>
						<ThinkingStepImage src={ogImage} caption="Profile card" />
					</Show>
				</ThinkingStep>
				<ThinkingStep
					icon="globe"
					label="Reading portfolio"
					status={status(2)}
					isLast={fired() <= 3}
				>
					<Show when={fired() > 3}>
						<ThinkingStepDetails
							testId="full-details"
							summary="Explored 4 pages"
							details={[
								'Read about.html',
								'Read projects.html',
								'Read resume.pdf',
								'Read contact.html',
							]}
						/>
					</Show>
				</ThinkingStep>
				<ThinkingStep
					icon="search"
					label="Searching for recent work"
					status={status(3)}
					isLast={fired() <= 4}
				>
					<Show when={fired() > 4}>
						<ThinkingStepSources>
							<ThinkingStepSource delay={0.05}>figma.com</ThinkingStepSource>
							<ThinkingStepSource delay={0.1}>behance.net</ThinkingStepSource>
							<ThinkingStepSource delay={0.15}>google.com</ThinkingStepSource>
						</ThinkingStepSources>
					</Show>
				</ThinkingStep>
				<ThinkingStep
					icon="brain"
					label="Analyzing results"
					description="Compiling findings into a summary."
					status={status(4)}
					isLast={fired() <= 5}
				/>
				<ThinkingStep
					icon="check"
					label="Research complete"
					status={status(5)}
					isLast
				/>
			</ThinkingStepsContent>
		</ThinkingSteps>
	);
}

export const title = 'ThinkingSteps';
export const group = 'Components';
export const listed = 'sidebar';

export function Demo() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			<DemoCard title="Basic">
				<BasicDemo />
			</DemoCard>
			<DemoCard title="Minimal">
				<MinimalDemo />
			</DemoCard>
			<PlaybackCard
				title="Streaming"
				id="streaming"
				delays={[400, 1800, 3200, 4200, 5200]}
			>
				{(sequence) => <StreamingDemo sequence={sequence} />}
			</PlaybackCard>
			<PlaybackCard
				title="Streaming text"
				id="text"
				delays={[400, 6000, 12000, 18000, 24000, 30000, 32000]}
			>
				{(sequence) => <StreamingTextDemo sequence={sequence} />}
			</PlaybackCard>
			<PlaybackCard
				title="With images"
				id="images"
				delays={[400, 1800, 3400, 5000, 6000]}
			>
				{(sequence) => <WithImagesDemo sequence={sequence} />}
			</PlaybackCard>
			<PlaybackCard
				title="Full"
				id="full"
				delays={[400, 1600, 2800, 3800, 5000, 6200, 7200]}
			>
				{(sequence) => <FullDemo sequence={sequence} />}
			</PlaybackCard>
		</div>
	);
}

/** Scrolls the page until the element with this test id is mid-window. */
async function scrollTo(shot: ShotContext, testId: string) {
	for (let attempt = 0; attempt < 2; attempt++) {
		await shot.scroll(600, 400, 0, shot.centerOf(testId).y - 380);
		await shot.settle();
	}
}

export const scenarios: DemoModule['scenarios'] = async (shot) => {
	await shot.hover('basic-header');
	shot.capture('header-hover');
	const openTabStops = shot.tabStopCount();
	const panel = shot.aria('basic-header').controls;
	if (!Array.isArray(panel) || panel.length !== 1)
		throw new Error('an open trigger controls its panel');
	if (!shot.hasAriaNode(String(panel[0])))
		throw new Error('the controlled panel is not in the accessibility tree');
	await shot.click('basic-header');
	shot.capture('basic-collapsed');
	shot.expectAria('basic-header', { expanded: false, controls: undefined });
	// The closed panel's own trigger leaves the tab order with it.
	if (shot.tabStopCount() !== openTabStops - 1)
		throw new Error("a closed panel's trigger is still a tab stop");
	await shot.click('basic-header');
	await shot.click('basic-details');
	shot.capture('basic-details-open');

	// Streaming restarts from zero, so each step is caught while it is active.
	await scrollTo(shot, 'streaming-playback');
	await shot.settle(3000);
	shot.expectText('Replay', true);
	await shot.click('streaming-playback');
	await shot.settle(900);
	shot.capture('streaming-step-1');
	await shot.settle(1300);
	shot.capture('streaming-step-2');
	await shot.settle(1700);
	shot.capture('streaming-step-3');
	await shot.settle(2000);
	shot.capture('streaming-done');

	// These cards have been playing since the page opened and are further down.
	await scrollTo(shot, 'text-playback');
	shot.capture('streaming-text');
	await scrollTo(shot, 'images-playback');
	shot.capture('with-images');
	await scrollTo(shot, 'full-playback');
	shot.capture('full');
	await shot.click('full-details');
	shot.capture('full-details-open');
};
