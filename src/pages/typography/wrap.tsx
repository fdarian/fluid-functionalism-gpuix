import { color, type as scale, weight } from '#/lib/theme';
import { Mono, Specimen, TweakFrame } from './specimen';

// The source measured both at 214px. gpuix has no `text-wrap`, so the "good"
// side is the same text with the break the browser picks written in as a
// newline (`whiteSpace: "pre-line"`), and the "bad" side wraps plainly.
const HEADLINE = 'Give every component the same motion';
const BALANCED_HEADLINE = 'Give every component\nthe same motion';
const PARAGRAPH =
	'Hover glides from item to item instead of blinking, so the highlight always sits under your cursor.';
const PRETTY_PARAGRAPH = PARAGRAPH.replace(' your cursor.', '\nyour cursor.');
const SAMPLE_WIDTH = 214;

const sample = {
	width: SAMPLE_WIDTH,
	maxWidth: '100%',
} as const;

const specimenFrame = {
	paddingLeft: 16,
	paddingRight: 16,
	paddingTop: 20,
	paddingBottom: 20,
} as const;

function Heading(props: { children: string }) {
	return (
		<text
			style={{
				...scale.title,
				...sample,
				fontVariationSettings: weight.semibold,
				color: color.foreground,
				whiteSpace: 'pre-line',
			}}
		>
			{props.children}
		</text>
	);
}

function Paragraph(props: { children: string }) {
	return (
		<text
			style={{
				...scale.body,
				...sample,
				color: color.mutedForeground,
				whiteSpace: 'pre-line',
			}}
		>
			{props.children}
		</text>
	);
}

export function BalanceDemo() {
	return (
		<TweakFrame testId="tweak-balance">
			<Specimen
				good={false}
				testId="balance-wrap"
				frame={specimenFrame}
				caption={
					<>
						<Mono>wrap</Mono> leaves a short last line
					</>
				}
			>
				<Heading>{HEADLINE}</Heading>
			</Specimen>
			<Specimen
				good
				testId="balance-balance"
				frame={specimenFrame}
				caption={
					<>
						<Mono>balance</Mono> evens the lines
					</>
				}
			>
				<Heading>{BALANCED_HEADLINE}</Heading>
			</Specimen>
		</TweakFrame>
	);
}

export function PrettyDemo() {
	return (
		<TweakFrame testId="tweak-pretty">
			<Specimen
				good={false}
				testId="pretty-wrap"
				frame={specimenFrame}
				caption={
					<>
						<Mono>wrap</Mono> leaves one word alone
					</>
				}
			>
				<Paragraph>{PARAGRAPH}</Paragraph>
			</Specimen>
			<Specimen
				good
				testId="pretty-pretty"
				frame={specimenFrame}
				caption={
					<>
						<Mono>pretty</Mono> brings a word down to join it
					</>
				}
			>
				<Paragraph>{PRETTY_PARAGRAPH}</Paragraph>
			</Specimen>
		</TweakFrame>
	);
}
