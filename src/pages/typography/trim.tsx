import { capTrim, color, linePx, type as scale, shape } from '#/lib/theme';
import { MARK_BLUE, MARK_RED, Specimen, TweakFrame } from './specimen';

// Inter's metrics at the body role (13px on a 20px line), from the font's
// hhea and OS/2 tables (2048 units per em): ascender 1984, descender 494,
// capitals 1490. The line box reaches 5.3px past the capitals and 5.3px past
// the baseline, so 8px of padding reads as 13px. Trimmed, the box stops at the
// capitals and the baseline, and 8px reads as 8px. The markers are placed from
// these numbers, not measured as the source's are.
const FONT_SIZE = scale.body.fontSize;
const LINE = linePx(scale.body.lineHeight);
const ASCENDER = 1984 / 2048;
const DESCENDER = 494 / 2048;
const CAP_HEIGHT = 1490 / 2048;
const HALF_LEADING = (LINE - (ASCENDER + DESCENDER) * FONT_SIZE) / 2;
/** From the line box's top to the capitals, and to the baseline. */
const ABOVE_CAPS = HALF_LEADING + (ASCENDER - CAP_HEIGHT) * FONT_SIZE;
const BASELINE = HALF_LEADING + ASCENDER * FONT_SIZE;

const PADDING = 8;
const CHIP_LABEL = 'Draft saved';

/**
 * A chip with 8px of padding on every side. Blue lines mark its label's
 * capitals and baseline; what the line box adds past them is tinted red.
 */
function TrimChip(props: { trimmed: boolean }) {
	const labelTop = PADDING;
	const cap = labelTop + (props.trimmed ? 0 : ABOVE_CAPS);
	const base = props.trimmed
		? cap + CAP_HEIGHT * FONT_SIZE
		: labelTop + BASELINE;
	const labelBottom = labelTop + LINE;
	return (
		<div
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
				padding: PADDING,
				borderRadius: shape.bg,
				backgroundColor: color.tint,
			}}
		>
			{props.trimmed ? null : (
				<>
					<div
						style={{
							position: 'absolute',
							left: PADDING,
							right: PADDING,
							top: labelTop,
							height: cap - labelTop,
							backgroundColor: MARK_RED,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							left: PADDING,
							right: PADDING,
							top: base,
							height: labelBottom - base,
							backgroundColor: MARK_RED,
						}}
					/>
				</>
			)}
			<text
				style={{
					...scale.body,
					color: color.foreground,
					whiteSpace: 'nowrap',
					...(props.trimmed ? { textBox: capTrim } : {}),
				}}
			>
				{CHIP_LABEL}
			</text>
			{[cap, base].map((y) => (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: y - 0.5,
						height: 1,
						backgroundColor: MARK_BLUE,
					}}
				/>
			))}
		</div>
	);
}

const above = (trimmed: boolean) =>
	`${Math.round(PADDING + (trimmed ? 0 : ABOVE_CAPS))}px above the capitals`;

export function TrimDemo() {
	return (
		<TweakFrame testId="tweak-trim">
			<Specimen
				good={false}
				testId="trim-untrimmed"
				caption={`Untrimmed: ${above(false)}`}
				frame={{
					height: 64,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<TrimChip trimmed={false} />
			</Specimen>
			<Specimen
				good
				testId="trim-trimmed"
				caption={`Trimmed: ${above(true)}`}
				frame={{
					height: 64,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<TrimChip trimmed />
			</Specimen>
		</TweakFrame>
	);
}
