import { createSignal, type JSX } from 'solid-js';
import { Slider, type SliderValue } from '#/components/slider';
import { createCulling, OnScreenContext } from '#/lib/cull';
import type { ShotContext } from '#/lib/demo';
import { color, siteType, weight } from '#/lib/theme';

export const title = 'Audio Mixer';
export const group = 'Pages';
export const order = 20;
export const layout = 'docs';
export const listed = 'menu';
export const menuIcon = 'sliders-horizontal';
export const menuKeywords = ['mixer', 'eq', 'audio', 'slider'];

/** One screenshot per scroll: the last stops at the page end, so it shows Settings and Master Controls together. */
const SCROLL_STEP = 560;

export async function scenarios(shot: ShotContext) {
	for (const name of [
		'parametric-eq',
		'compressor',
		'effects-sends',
		'settings',
	]) {
		await shot.scroll(400, 400, 0, SCROLL_STEP);
		await shot.settle(200);
		shot.capture(name);
	}
}

const QUALITY_LABELS = ['Off', 'Low', 'Medium', 'High', 'Ultra'];
const REVERB_TYPES = ['Room', 'Hall', 'Plate', 'Spring', 'Chamber'];
const FILTER_MODES = ['LP', 'BP', 'HP', 'Notch'];

function numberState(initial: number) {
	const [value, setValue] = createSignal(initial);
	return {
		value,
		set(next: SliderValue) {
			if (typeof next !== 'number') {
				throw new Error('A single-thumb slider reported a range');
			}
			setValue(next);
		},
	};
}

function rangeState(initial: [number, number]) {
	const [value, setValue] = createSignal(initial);
	return {
		value,
		set(next: SliderValue) {
			if (typeof next === 'number') {
				throw new Error('A range slider reported a single value');
			}
			setValue(next);
		},
	};
}

function labelAt(labels: readonly string[], index: number) {
	const label = labels[index];
	if (label === undefined) throw new Error(`There is no label ${index}`);
	return label;
}

const percent = (v: number) => `${v}%`;

function decibels(v: number) {
	const db = ((v - 50) / 50) * 12;
	return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
}

function hertz(v: number) {
	return v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v} Hz`;
}

/** Hidden, title included, while far from the page scroller (`createCulling`); it keeps its height. */
function Section(props: { title: string; gap: number; children: JSX.Element }) {
	const culling = createCulling();
	return (
		<div
			ref={culling.ref}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 16,
				...culling.style(),
			}}
		>
			<OnScreenContext.Provider value={culling.onScreen}>
				<text
					style={{
						fontSize: 15,
						lineHeight: '22px',
						fontVariationSettings: weight.semibold,
						color: color.foreground,
					}}
				>
					{props.title}
				</text>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: props.gap,
					}}
				>
					{props.children}
				</div>
			</OnScreenContext.Provider>
		</div>
	);
}

export function Page(): JSX.Element {
	const volume = numberState(78);
	const bass = numberState(55);
	const mid = numberState(50);
	const treble = numberState(62);
	const presence = numberState(45);

	const lowCut = numberState(30);
	const lowShelf = numberState(40);
	const midFreq = numberState(50);
	const midGain = numberState(50);
	const highShelf = numberState(55);
	const highCut = numberState(12000);

	const reverbSend = numberState(35);
	const delaySend = numberState(20);
	const chorusSend = numberState(0);

	const threshold = numberState(65);
	const ratio = numberState(30);
	const attack = numberState(15);
	const release = numberState(45);
	const makeupGain = numberState(20);

	const reverbType = numberState(1);
	const quality = numberState(3);
	const filterMode = numberState(0);
	const oversample = numberState(1);

	const masterVolume = numberState(80);
	const pan = numberState(50);
	const tempo = numberState(120);
	const swing = numberState(0);
	const dryWet = numberState(50);
	const feedback = numberState(35);

	const frequencyRange = rangeState([200, 8000]);
	const dynamicRange = rangeState([20, 80]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
			{/* The page heading is `App`'s, a column gap above; the source sets it 4px above the subtitle. */}
			<div style={{ marginTop: -20 }}>
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					Slider variants styled as a music production control surface.
				</text>
			</div>

			<Section title="Channel Strip" gap={4}>
				<Slider
					value={volume.value()}
					onChange={volume.set}
					label="Volume"
					valuePosition="right"
					formatValue={percent}
				/>
				<Slider
					value={bass.value()}
					onChange={bass.set}
					label="Bass"
					valuePosition="right"
					formatValue={percent}
				/>
				<Slider
					value={mid.value()}
					onChange={mid.set}
					label="Mid"
					valuePosition="right"
					formatValue={percent}
				/>
				<Slider
					value={treble.value()}
					onChange={treble.set}
					label="Treble"
					valuePosition="right"
					formatValue={percent}
				/>
				<Slider
					value={presence.value()}
					onChange={presence.set}
					label="Presence"
					valuePosition="right"
					formatValue={percent}
				/>
			</Section>

			<Section title="Parametric EQ" gap={4}>
				<Slider
					value={lowCut.value()}
					onChange={lowCut.set}
					min={20}
					max={500}
					step={10}
					label="Low Cut"
					valuePosition="right"
					formatValue={(v) => `${v} Hz`}
				/>
				<Slider
					value={lowShelf.value()}
					onChange={lowShelf.set}
					label="Low Shelf"
					valuePosition="right"
					formatValue={decibels}
				/>
				<Slider
					value={midFreq.value()}
					onChange={midFreq.set}
					min={200}
					max={8000}
					step={100}
					label="Mid Freq"
					valuePosition="right"
					formatValue={hertz}
				/>
				<Slider
					value={midGain.value()}
					onChange={midGain.set}
					label="Mid Gain"
					valuePosition="right"
					formatValue={decibels}
				/>
				<Slider
					value={highShelf.value()}
					onChange={highShelf.set}
					label="High Shelf"
					valuePosition="right"
					formatValue={decibels}
				/>
				<Slider
					value={highCut.value()}
					onChange={highCut.set}
					min={1000}
					max={20000}
					step={500}
					label="High Cut"
					valuePosition="right"
					formatValue={hertz}
				/>
			</Section>

			<Section title="Range Selection" gap={4}>
				<Slider
					value={frequencyRange.value()}
					onChange={frequencyRange.set}
					min={20}
					max={20000}
					step={100}
					label="Freq Band"
					valuePosition="right"
					formatValue={(v) =>
						v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
					}
				/>
				<Slider
					value={dynamicRange.value()}
					onChange={dynamicRange.set}
					label="Dynamics"
					valuePosition="right"
					formatValue={percent}
				/>
			</Section>

			<Section title="Compressor" gap={4}>
				<Slider
					value={threshold.value()}
					onChange={threshold.set}
					label="Threshold"
					valuePosition="right"
					formatValue={(v) => `${-Math.round((100 - v) * 0.6)} dB`}
				/>
				<Slider
					value={ratio.value()}
					onChange={ratio.set}
					label="Ratio"
					valuePosition="right"
					step={5}
					showSteps
					formatValue={(v) => `${(1 + (v / 100) * 19).toFixed(1)}:1`}
				/>
				<Slider
					value={attack.value()}
					onChange={attack.set}
					label="Attack"
					valuePosition="right"
					formatValue={(v) => `${(0.1 + (v / 100) * 99.9).toFixed(1)} ms`}
				/>
				<Slider
					value={release.value()}
					onChange={release.set}
					label="Release"
					valuePosition="right"
					formatValue={(v) => `${Math.round(10 + (v / 100) * 990)} ms`}
				/>
				<Slider
					value={makeupGain.value()}
					onChange={makeupGain.set}
					label="Makeup"
					valuePosition="right"
					formatValue={(v) => `+${((v / 100) * 24).toFixed(1)} dB`}
				/>
			</Section>

			<Section title="Effects Sends" gap={4}>
				<Slider
					value={reverbSend.value()}
					onChange={reverbSend.set}
					label="Reverb"
					valuePosition="tooltip"
					formatValue={percent}
				/>
				<Slider
					value={delaySend.value()}
					onChange={delaySend.set}
					label="Delay"
					valuePosition="tooltip"
					formatValue={percent}
				/>
				<Slider
					value={chorusSend.value()}
					onChange={chorusSend.set}
					label="Chorus"
					valuePosition="tooltip"
					formatValue={percent}
				/>
			</Section>

			<Section title="Settings" gap={8}>
				<Slider
					variant="pips"
					label="Reverb Type"
					value={reverbType.value()}
					onChange={reverbType.set}
					min={0}
					max={4}
					formatValue={(v) => labelAt(REVERB_TYPES, v)}
				/>
				<Slider
					variant="pips"
					label="Quality"
					value={quality.value()}
					onChange={quality.set}
					min={0}
					max={4}
					formatValue={(v) => labelAt(QUALITY_LABELS, v)}
				/>
				<Slider
					variant="pips"
					label="Filter"
					value={filterMode.value()}
					onChange={filterMode.set}
					min={0}
					max={3}
					formatValue={(v) => labelAt(FILTER_MODES, v)}
				/>
				<Slider
					variant="pips"
					label="Oversample"
					value={oversample.value()}
					onChange={oversample.set}
					min={0}
					max={3}
					formatValue={(v) => `${2 ** v}x`}
				/>
			</Section>

			<Section title="Master Controls" gap={8}>
				<Slider
					variant="scrubber"
					label="Master"
					value={masterVolume.value()}
					onChange={masterVolume.set}
					min={0}
					max={100}
					formatValue={percent}
				/>
				<Slider
					variant="scrubber"
					label="Pan"
					value={pan.value()}
					onChange={pan.set}
					min={0}
					max={100}
					formatValue={(v) => {
						if (v === 50) return 'C';
						return v < 50 ? `L${50 - v}` : `R${v - 50}`;
					}}
				/>
				<Slider
					variant="scrubber"
					label="Tempo"
					value={tempo.value()}
					onChange={tempo.set}
					min={60}
					max={200}
					formatValue={(v) => `${v} BPM`}
				/>
				<Slider
					variant="scrubber"
					label="Swing"
					value={swing.value()}
					onChange={swing.set}
					min={0}
					max={100}
					formatValue={percent}
				/>
				<Slider
					variant="scrubber"
					label="Dry / Wet"
					value={dryWet.value()}
					onChange={dryWet.set}
					min={0}
					max={100}
					formatValue={percent}
				/>
				<Slider
					variant="scrubber"
					label="Feedback"
					value={feedback.value()}
					onChange={feedback.set}
					min={0}
					max={100}
					formatValue={percent}
				/>
			</Section>
		</div>
	);
}
