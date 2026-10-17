import type {
	DomEvent,
	HostElement,
	HostMouseEvent,
	KeyEvent,
} from '@gpuix/solid';
import { createPointerCapture } from 'base-ui-solid-gpuix/utils';
import { createSignal } from 'solid-js';
import { twShadow, withAlpha } from '#/lib/theme';
import { sc, scRing } from './theme';

const THUMB = 12;
const TRACK_HEIGHT = 4;

function pointerX(event: Pick<HostMouseEvent, 'x'>) {
	if (event.x === undefined) {
		throw new Error('Pointer event without coordinates');
	}
	return event.x;
}

/**
 * `components/shadcn/slider.tsx` over Radix: a 4px track whose range ends at the value's percentage, and a 12px
 * thumb that stays inside the track. Press anywhere to jump, drag to scrub, arrows / Page / Home / End step.
 */
export function ScSlider(props: {
	value: number;
	onValueChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	testId?: string;
}) {
	const min = () => props.min ?? 0;
	const max = () => props.max ?? 100;
	const step = () => props.step ?? 1;
	const [width, setWidth] = createSignal(0);
	const [dragging, setDragging] = createSignal(false);
	const capture = createPointerCapture('ScSlider');
	let root: HostElement | undefined;

	const percent = () => ((props.value - min()) / (max() - min())) * 100;
	const commit = (next: number) => {
		const snapped = Math.round((next - min()) / step()) * step() + min();
		props.onValueChange(Math.min(max(), Math.max(min(), snapped)));
	};
	const valueAt = (x: number) => {
		if (root === undefined || !root.mounted) {
			throw new Error('ScSlider is not mounted');
		}
		const box = root.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (x - box.x) / box.width));
		commit(min() + ratio * (max() - min()));
	};

	const onPress = (event: HostMouseEvent) => {
		if (event.button !== 0) return;
		capture.capture(event);
		setDragging(true);
		valueAt(pointerX(event));
	};
	const onMove = (event: HostMouseEvent) => {
		if (dragging()) valueAt(pointerX(event));
	};
	const onRelease = () => setDragging(false);

	const onKeyDown = (event: KeyEvent) => {
		const larger = step() * 10;
		const moves: Record<string, number | undefined> = {
			ArrowRight: props.value + step(),
			ArrowUp: props.value + step(),
			ArrowLeft: props.value - step(),
			ArrowDown: props.value - step(),
			PageUp: props.value + larger,
			PageDown: props.value - larger,
			Home: min(),
			End: max(),
		};
		const next = event.key === undefined ? undefined : moves[event.key];
		if (next === undefined) return;
		event.preventDefault();
		commit(next);
	};

	return (
		<div
			ref={(element) => {
				root = element;
				capture.ref(element);
			}}
			testId={props.testId}
			onMouseDown={onPress}
			onMouseMove={onMove}
			onMouseUp={onRelease}
			onLostPointerCapture={onRelease}
			onLayout={(event: DomEvent) => {
				if (event.width === undefined) {
					throw new Error('onLayout reported no width');
				}
				setWidth(event.width);
			}}
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				width: '100%',
				height: TRACK_HEIGHT,
				userSelect: 'none',
			}}
		>
			<div
				style={{
					position: 'relative',
					flexGrow: 1,
					height: TRACK_HEIGHT,
					borderRadius: TRACK_HEIGHT / 2,
					overflow: 'hidden',
					backgroundColor: withAlpha(sc.primary, 0.2),
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: 0,
						width: (width() * percent()) / 100,
						backgroundColor: sc.primary,
					}}
				/>
			</div>
			<div
				role="slider"
				tabIndex={0}
				aria-valuenow={props.value}
				aria-valuemin={min()}
				aria-valuemax={max()}
				aria-orientation="horizontal"
				onKeyDown={onKeyDown}
				testId={
					props.testId === undefined ? undefined : `${props.testId}-thumb`
				}
				style={{
					position: 'absolute',
					top: (TRACK_HEIGHT - THUMB) / 2,
					left: ((width() - THUMB) * percent()) / 100,
					width: THUMB,
					height: THUMB,
					borderRadius: THUMB / 2,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: withAlpha(sc.primary, 0.5),
					backgroundColor: '#FFFFFF',
					boxShadow: twShadow.sm,
					keyboardFocusDim: false,
					focusVisible: { ...scRing(), outlineWidth: 1, outlineOffset: 0 },
				}}
			/>
		</div>
	);
}
