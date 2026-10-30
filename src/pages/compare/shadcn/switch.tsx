import { createUniqueId } from 'solid-js';
import { transformFade, twShadow } from '#/lib/theme';
import { pressProps, ScLabel } from './parts';
import { sc, scRing } from './theme';

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const THUMB = 16;
/** `translate-x-px` and `translate-x-[17px]` from the thumb's flex position inside the 1px border. */
const OFF_X = 1;
const ON_X = 17;

/** `components/shadcn/switch.tsx` and its `Label`. */
export function ScSwitch(props: {
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	testId?: string;
}) {
	const labelId = createUniqueId();
	const toggle = () => props.onCheckedChange(!props.checked);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
			}}
		>
			<div
				{...pressProps({ onClick: toggle })}
				role="switch"
				aria-checked={props.checked}
				aria-labelledby={labelId}
				testId={props.testId}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					flexShrink: 0,
					width: TRACK_WIDTH,
					height: TRACK_HEIGHT,
					borderRadius: TRACK_HEIGHT / 2,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: sc.input,
					backgroundColor: props.checked ? sc.primary : sc.input,
					boxShadow: twShadow.sm,
					cursor: 'pointer',
					keyboardFocusDim: false,
					focusVisible: scRing(),
				}}
			>
				<div
					testId={props.testId && `${props.testId}-thumb`}
					style={{
						flexShrink: 0,
						width: THUMB,
						height: THUMB,
						borderRadius: THUMB / 2,
						backgroundColor: props.checked ? sc.primaryForeground : '#FFFFFF',
						boxShadow: twShadow.lg,
						pointerEvents: 'none',
						transform: `translateX(${props.checked ? ON_X : OFF_X}px)`,
						...transformFade(150),
					}}
				/>
			</div>
			<div id={labelId}>
				<ScLabel onClick={toggle}>{props.label}</ScLabel>
			</div>
		</div>
	);
}
