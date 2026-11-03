import { type HostElement, useGpuixRequired } from '@ghia/solid';
import { ScLabel } from './parts';
import { sc, scRadius, scRing } from './theme';

/** A shadcn `Label` over an `Input`: `space-y-1.5`, an `h-10` bordered field with `px-3`. */
export function ScInputField(props: {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	let input: HostElement | undefined;
	const focusInput = () => {
		if (input === undefined) throw new Error('ScInputField is not mounted');
		renderer.focusElement?.(input.id);
	};
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
			<ScLabel size={12} onClick={focusInput}>
				{props.label}
			</ScLabel>
			<div
				onClick={focusInput}
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					height: 40,
					paddingLeft: 12,
					paddingRight: 12,
					borderRadius: scRadius.md,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: sc.input,
					backgroundColor: sc.background,
					cursor: 'text',
					focusWithin: scRing(),
				}}
			>
				<input
					ref={(element) => {
						input = element;
					}}
					testId={props.testId}
					aria-label={props.label}
					value={props.value}
					placeholder={props.placeholder}
					theme={{
						text: sc.foreground,
						textMuted: sc.mutedForeground,
						textFaint: sc.mutedForeground,
						textDim: sc.mutedForeground,
						caret: sc.foreground,
					}}
					onChange={(event) => {
						if (event.value === undefined) {
							throw new Error('Input change without a value');
						}
						props.onChange(event.value);
					}}
					style={{
						flexGrow: 1,
						minWidth: 0,
						// The source input's content box: h-10 less the 1px borders and py-2.
						height: 22,
						fontSize: 14,
						lineHeight: '20px',
						fontWeight: 400,
						color: sc.foreground,
						backgroundColor: 'rgba(0,0,0,0)',
						keyboardFocusDim: false,
					}}
				/>
			</div>
		</div>
	);
}
