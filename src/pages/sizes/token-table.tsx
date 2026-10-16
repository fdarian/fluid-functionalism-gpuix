import { For, type JSX } from "solid-js";
import { MONO } from "#/lib/doc-page";
import {
	color,
	type SizeChoice,
	scheme,
	siteType,
	weight,
} from "#/lib/theme";
import { LADDER } from "./ladder";

interface TokenRow {
	token: string;
	applies: string;
	value: (step: SizeChoice) => string;
}

const px = (value: number) => `${value}px`;

const TOKEN_ROWS: readonly TokenRow[] = [
	{
		token: "control",
		applies:
			"Controls and rows — shared so menu rows line up with their trigger",
		value: (step) => px(LADDER[step].control),
	},
	{
		token: "segmentItem + segmentPad",
		applies: "Segmented tabs inside their padded list",
		value: (step) =>
			`${px(LADDER[step].segmentItem)} + ${px(LADDER[step].segmentPad)} = ${px(LADDER[step].control)}`,
	},
	{
		token: "text",
		applies: "Labels inside controls (the body role)",
		value: (step) =>
			`${LADDER[step].text.fontSize}px / ${LADDER[step].text.lineHeight}px`,
	},
	{
		token: "field",
		applies:
			"Text in editable fields: the body role. A desktop window has no touch step to 16px",
		value: (step) =>
			`${LADDER[step].text.fontSize}px / ${LADDER[step].text.lineHeight}px`,
	},
	{
		token: "icon",
		applies: "Leading/trailing icons, checkbox square, radio circle",
		value: (step) => px(LADDER[step].icon),
	},
	{
		token: "px / itemPx",
		applies: "Control / row horizontal padding",
		value: (step) => `${px(LADDER[step].px)} / ${px(LADDER[step].itemPx)}`,
	},
	{
		token: "gap",
		applies: "Icon-to-label and control-to-control gap",
		value: (step) => px(LADDER[step].gap),
	},
];

/** The columns that do not flex; "Applies to" takes the rest. */
const WIDTHS = { token: 188, default: 132, compact: 132 } as const;

const CELL = {
	paddingTop: 8,
	paddingBottom: 8,
	paddingLeft: 12,
	paddingRight: 12,
};

function Cell(props: {
	width?: number;
	first?: boolean;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				...CELL,
				...(props.first === true ? { paddingLeft: 0 } : {}),
				...(props.width === undefined
					? { flexGrow: 1, flexBasis: 0, minWidth: 0 }
					: { width: props.width, flexShrink: 0 }),
				display: "flex",
				flexDirection: "column",
				alignItems: "stretch",
			}}
		>
			{props.children}
		</div>
	);
}

function HeadText(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.body,
				fontWeight: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/** `code` chip: `rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption`. */
function TokenChip(props: { children: string }) {
	return (
		<div
			style={{
				alignSelf: "flex-start",
				paddingLeft: 4,
				paddingRight: 4,
				paddingTop: 2,
				paddingBottom: 2,
				borderRadius: 4,
				backgroundColor: scheme() === "light" ? "#EBEBED" : "#2C2C2C",
			}}
		>
			<text
				style={{
					fontFamily: MONO,
					...siteType.caption,
					color: color.foreground,
					whiteSpace: "nowrap",
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

export function TokenTable() {
	return (
		<div
			testId="token-table"
			style={{ display: "flex", flexDirection: "column", width: "100%" }}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					borderBottomWidth: 1,
					borderColor: color.border,
				}}
			>
				<Cell width={WIDTHS.token} first>
					<HeadText>Token</HeadText>
				</Cell>
				<Cell>
					<HeadText>Applies to</HeadText>
				</Cell>
				<Cell width={WIDTHS.default}>
					<HeadText>Default</HeadText>
				</Cell>
				<Cell width={WIDTHS.compact}>
					<HeadText>Compact</HeadText>
				</Cell>
			</div>
			<For each={TOKEN_ROWS}>
				{(row) => (
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							borderBottomWidth: 1,
							borderColor: color.borderFaint,
						}}
					>
						<Cell width={WIDTHS.token} first>
							<TokenChip>{row.token}</TokenChip>
						</Cell>
						<Cell>
							<text style={{ ...siteType.body, color: color.mutedForeground }}>
								{row.applies}
							</text>
						</Cell>
						<Cell width={WIDTHS.default}>
							<text
								style={{
									...siteType.body,
									color: color.foreground,
									whiteSpace: "nowrap",
								}}
							>
								{row.value("default")}
							</text>
						</Cell>
						<Cell width={WIDTHS.compact}>
							<text
								style={{
									...siteType.body,
									color: color.foreground,
									whiteSpace: "nowrap",
								}}
							>
								{row.value("compact")}
							</text>
						</Cell>
					</div>
				)}
			</For>
		</div>
	);
}
