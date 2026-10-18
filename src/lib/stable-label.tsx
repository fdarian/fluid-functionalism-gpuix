import type { HostElement } from '@gpuix/solid';
import { colorFade, type as scale, weight } from './theme';

/**
 * A label that gains weight in place. A hidden semibold copy and the visible
 * copy share one grid cell, so the label is as wide as the semibold copy and
 * going semibold never moves what is beside it. It wraps at that width, as the
 * source's `inline-grid` span does.
 */
export function StableLabel(props: {
	text: string;
	heavy: boolean;
	color: string;
	/** Fills the row's spare width (a menu row) instead of hugging the text. */
	grow?: boolean;
	/** Defaults to the body role. */
	textStyle?: { fontSize: number; lineHeight: string };
	/** Ease a colour change over 80 ms (the weight still switches at once). */
	fade?: boolean;
	/** A label wider than its row ends in an ellipsis instead of wrapping. */
	truncate?: boolean;
	/** A label that never wraps (the source's tab labels). */
	nowrap?: boolean;
	/** The wrapper, for a caller that measures the label's width. */
	labelRef?: (element: HostElement) => void;
	testId?: string;
}) {
	const singleLine = () => props.truncate === true || props.nowrap === true;
	const cellStyle = (heavy: boolean) => ({
		...(props.textStyle ?? scale.body),
		gridColumnStart: 1,
		gridRowStart: 1,
		fontVariationSettings: heavy ? weight.semibold : weight.normal,
		...(singleLine() ? { whiteSpace: 'nowrap' as const } : {}),
		...(props.truncate === true
			? { overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }
			: {}),
	});
	return (
		<div
			ref={props.labelRef}
			style={{
				display: 'inline-grid',
				textAlign: 'left',
				...(props.truncate === true
					? { gridTemplateColumns: 'minmax(0, 1fr)' }
					: {}),
				...(props.grow === true ? { flexGrow: 1 } : {}),
				...(props.grow === true || props.truncate === true
					? { minWidth: 0 }
					: {}),
			}}
		>
			<text style={{ ...cellStyle(true), opacity: 0 }}>{props.text}</text>
			<text
				testId={props.testId}
				style={{
					...cellStyle(props.heavy),
					color: props.color,
					...(props.fade === true ? colorFade : {}),
				}}
			>
				{props.text}
			</text>
		</div>
	);
}
