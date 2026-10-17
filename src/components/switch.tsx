import { MotionConfig, motion } from '@gpuix/solid';
import {
	createSwitchRoot,
	createSwitchThumb,
} from 'base-ui-solid-gpuix/switch';
import { createSignal, createUniqueId } from 'solid-js';
import {
	color,
	fade,
	focusRing,
	type as scale,
	sizeChoice,
	motion as tween,
	twShadow,
	weight,
} from '#/lib/theme';

export type SwitchSize = 'default' | 'compact';

const METRICS = {
	default: {
		trackWidth: 34,
		trackHeight: 20,
		thumbSize: 16,
		pillExtend: 2,
		pressExtend: 4,
		pressShrink: 4,
		gap: 8,
		padX: 12,
		padY: 8,
		text: scale.body,
	},
	compact: {
		trackWidth: 28,
		trackHeight: 16,
		thumbSize: 12,
		pillExtend: 2,
		pressExtend: 3,
		pressShrink: 3,
		gap: 4,
		padX: 10,
		padY: 4,
		text: scale.bodyCompact,
	},
} as const;

/** 2px between a resting thumb and every track edge. */
const THUMB_OFFSET = 2;
/** Pointer travel before a press turns into a drag; under it the gesture stays a click. */
const DRAG_DEAD_ZONE = 2;

export function Switch(props: {
	label: string;
	checked: boolean;
	onToggle: () => void;
	disabled?: boolean;
	size?: SwitchSize;
	/** A settings row: the label at the left, the track at the right, across the whole width, 36 px tall (the playground panels' `flex-row-reverse justify-between h-9 px-1 py-0`). */
	settingsRow?: boolean;
	testId?: string;
}) {
	const m = () => METRICS[props.size ?? sizeChoice()];
	const labelId = createUniqueId();
	const thumbTravel = () => m().trackWidth - m().thumbSize - THUMB_OFFSET * 2;
	const pressedThumbWidth = () => m().thumbSize + m().pressExtend;

	// The row and the track each report their own enter and leave, so hover is a count of the elements the pointer is over.
	const [overCount, setOverCount] = createSignal(0);
	const hovered = () => overCount() > 0;

	const thumbWidth = () =>
		thumb.pressed()
			? pressedThumbWidth()
			: hovered()
				? m().thumbSize + m().pillExtend
				: m().thumbSize;
	const thumbHeight = () =>
		thumb.pressed() ? m().thumbSize - m().pressShrink : m().thumbSize;
	const thumbY = () =>
		thumb.pressed() ? THUMB_OFFSET + m().pressShrink / 2 : THUMB_OFFSET;
	// Checked, the extra width grows leftward so the outer edge stays pinned to the track end.
	const restX = () =>
		props.checked
			? THUMB_OFFSET + thumbTravel() - (thumbWidth() - m().thumbSize)
			: THUMB_OFFSET;

	const root = createSwitchRoot({
		checked: () => props.checked,
		disabled: () => props.disabled,
		onCheckedChange: () => props.onToggle(),
		labelId: () => labelId,
	});
	const thumb = createSwitchThumb({
		checked: () => props.checked,
		disabled: () => props.disabled,
		onCheckedChange: () => props.onToggle(),
		restX,
		dragMin: () => THUMB_OFFSET,
		dragMax: () => m().trackWidth - THUMB_OFFSET - pressedThumbWidth(),
		deadZone: DRAG_DEAD_ZONE,
	});

	const hoverHandlers = {
		onMouseEnter: () => setOverCount(overCount() + 1),
		onMouseLeave: () => setOverCount(overCount() - 1),
	};

	const trackColor = () => {
		if (props.checked) return hovered() ? color.switchOnHover : color.switchOn;
		return hovered() ? color.switchOffHover : color.accent;
	};

	return (
		<div
			ref={thumb.ref}
			testId={props.testId}
			{...hoverHandlers}
			{...thumb.pressProps}
			style={{
				display: 'flex',
				flexDirection: props.settingsRow === true ? 'row-reverse' : 'row',
				alignItems: 'center',
				gap: m().gap,
				paddingLeft: props.settingsRow === true ? 4 : m().padX,
				paddingRight: props.settingsRow === true ? 4 : m().padX,
				paddingTop: props.settingsRow === true ? 0 : m().padY,
				paddingBottom: props.settingsRow === true ? 0 : m().padY,
				...(props.settingsRow === true
					? { justifyContent: 'space-between', width: '100%', height: 36 }
					: {}),
				cursor: 'pointer',
				userSelect: 'none',
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? 'none' : 'auto',
			}}
		>
			<div
				{...root.rootProps}
				testId={
					props.testId === undefined ? undefined : `${props.testId}-track`
				}
				{...hoverHandlers}
				style={{
					position: 'relative',
					flexShrink: 0,
					width: m().trackWidth,
					height: m().trackHeight,
					borderRadius: m().trackHeight / 2,
					backgroundColor: trackColor(),
					// Not the full colour list: the source's ring is a box shadow that appears at once, and an outline-color
					// fade would catch the port's outline ring.
					...fade(['background-color'], 80),
					cursor: 'pointer',
					keyboardFocusDim: false,
					focusVisible: focusRing(2),
				}}
			>
				{/* The source slides the thumb with `animate()` on a motion value, which reduced motion leaves alone, and shapes it with width, height and y, which it jumps. Two layers keep both: this one slides under a config that never reduces and the thumb inside it goes back to following the user's setting. */}
				<MotionConfig reducedMotion="never">
					<motion.div
						initial={false}
						animate={{ left: thumb.dragX() ?? restX() }}
						// While dragging the thumb follows the pointer.
						transition={thumb.dragX() === null ? tween.moderate : tween.snap}
						style={{
							position: 'absolute',
							top: 0,
							width: 0,
							height: m().trackHeight,
						}}
					>
						<MotionConfig reducedMotion="user">
							<motion.div
								initial={false}
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-thumb`
								}
								animate={{
									top: thumbY(),
									width: thumbWidth(),
									height: thumbHeight(),
								}}
								transition={tween.moderate}
								style={{
									position: 'absolute',
									left: 0,
									backgroundColor: '#FFFFFF',
									borderRadius: 9999,
									boxShadow: twShadow.sm,
								}}
							/>
						</MotionConfig>
					</motion.div>
				</MotionConfig>
			</div>
			<text
				id={labelId}
				style={{
					...m().text,
					fontWeight: weight.normal,
					whiteSpace: 'nowrap',
					color: props.checked ? color.foreground : color.mutedForeground,
					...fade(['color'], 80),
				}}
			>
				{props.label}
			</text>
		</div>
	);
}
