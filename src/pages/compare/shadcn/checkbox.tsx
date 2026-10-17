import { createUniqueId, Show } from 'solid-js';
import { LUCIDE, LucideIcon, pressProps, ScLabel } from './parts';
import { sc, scRadius, scRing } from './theme';

/** `components/shadcn/checkbox.tsx` and a `Label` beside it, as the preview lays them out. */
export function ScCheckbox(props: {
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
				{...pressProps({ onClick: toggle, enter: false })}
				role="checkbox"
				aria-checked={props.checked}
				aria-labelledby={labelId}
				testId={props.testId}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					width: 16,
					height: 16,
					borderRadius: scRadius.sm,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: sc.primary,
					backgroundColor: props.checked ? sc.primary : 'rgba(0,0,0,0)',
					keyboardFocusDim: false,
					focusVisible: scRing(),
				}}
			>
				<Show when={props.checked}>
					<LucideIcon
						name={LUCIDE.check}
						size={16}
						strokeWidth={2}
						color={sc.primaryForeground}
					/>
				</Show>
			</div>
			<div id={labelId}>
				<ScLabel onClick={toggle}>{props.label}</ScLabel>
			</div>
		</div>
	);
}
