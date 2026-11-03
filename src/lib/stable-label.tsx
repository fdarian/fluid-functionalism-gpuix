import type { HostElement } from '@ghia/solid';
import {
	capTrim,
	clippedCapTrim,
	colorFade,
	colorWeightFade,
	type as scale,
	weight,
	weightFade,
} from './theme';

/**
 * A label that gains weight in place. Hidden normal and semibold copies and the
 * visible copy share one grid cell, so the label is as wide as the wider copy
 * and its box keeps its width when the weight changes. It wraps at that width,
 * as the source's `inline-grid` span does. The source reserves the semibold copy
 * only, so a label whose normal copy is wider (Pro plan) shrinks 1px when
 * selected; the second ghost stops that. gpuix has no text-measure API, so a
 * hidden copy is the only way to hold the wider width.
 *
 * The second ghost is within noise on gpuix b03d4e27 (sidebar-sweep draw p95
 * -0.35..+0.30 ms over seven pages; it was +1.0-1.7 ms on 5fda771a): opacity:0
 * paints nothing and hidden labels are not re-measured (gpuix #46, #58). Kept
 * because the box must not change width with the weight (pinned by
 * check-weight-widths).
 */
export function StableLabel(props: {
	text: string;
	heavy: boolean;
	color: string;
	/** Fills the row's spare width (a menu row) instead of hugging the text. */
	grow?: boolean;
	/** Defaults to the body role. */
	textStyle?: { fontSize: number; lineHeight: string };
	/** Ease a colour change over 80 ms too; the weight always eases unless `snapWeight`. */
	fade?: boolean;
	/** The weight switches at once: a row the source draws without a weight transition. */
	snapWeight?: boolean;
	/** A label wider than its row ends in an ellipsis instead of wrapping. */
	truncate?: boolean;
	/** A label that never wraps (the source's tab labels). */
	nowrap?: boolean;
	/** The source's `text-box: trim-both cap alphabetic` on every copy. */
	trim?: boolean;
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
		...(props.trim === true
			? props.truncate === true
				? clippedCapTrim('0.25em')
				: { textBox: capTrim }
			: {}),
	});
	const transition = () => {
		const colors = props.fade === true;
		const weights = props.snapWeight !== true;
		if (colors) return weights ? colorWeightFade : colorFade;
		return weights ? weightFade : {};
	};
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
			<text style={{ ...cellStyle(false), opacity: 0 }}>{props.text}</text>
			<text style={{ ...cellStyle(true), opacity: 0 }}>{props.text}</text>
			<text
				testId={props.testId}
				style={{
					...cellStyle(props.heavy),
					color: props.color,
					...transition(),
				}}
			>
				{props.text}
			</text>
		</div>
	);
}
