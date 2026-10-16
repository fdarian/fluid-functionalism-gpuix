import { buttonProps, useGpuixRequired } from "@gpuix/solid";
import { type JSX, Show } from "solid-js";
import {
	color,
	fade,
	scheme,
	siteType,
	weight,
	withAlpha,
} from "../../lib/theme";

/** `.bento-card-border`: the card's rule and drop shadow at rest, on hover and with focus inside. */
function edge() {
	const dark = scheme() === "dark";
	return {
		rest: {
			borderColor: dark ? color.borderFaint : color.border,
			boxShadow: shadow(dark ? 0.4 : 0.04, 2),
		},
		hover: {
			borderColor: dark ? color.border : withAlpha(color.foreground, 0.2),
			boxShadow: shadow(dark ? 0.6 : 0.08, 2),
		},
		focus: {
			borderColor: withAlpha(color.foreground, dark ? 0.3 : 0.35),
			boxShadow: shadow(dark ? 0.7 : 0.12, 3),
		},
	};
}

function shadow(alpha: number, blurRadius: number) {
	return {
		offsetX: 0,
		offsetY: 1,
		blurRadius,
		spreadRadius: 0,
		color: `rgba(0,0,0,${alpha})`,
	};
}

/**
 * `BentoCard` as /compare uses it: a stage, then a footer naming the component. With a `link` the name is a row
 * across the footer that opens the component's page; without, it is a label.
 */
export function CompareCard(props: {
	name: string;
	testId: string;
	link?: () => void;
	children: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	const footerRule = () => withAlpha(color.foreground, 0.048);
	return (
		<div
			testId={props.testId}
			style={{
				flexBasis: 0,
				flexGrow: 1,
				minWidth: 0,
				minHeight: 420,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				borderRadius: 12,
				borderWidth: 1,
				// Transparent in the source; gpuix paints a shadow under its element, so a see-through card would show it as a darker fill.
				backgroundColor: color.background,
				...edge().rest,
				...fade(["border-color"], 80),
				hover: edge().hover,
				focusWithin: edge().focus,
			}}
		>
			<div
				style={{
					flexGrow: 1,
					minHeight: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					paddingLeft: 24,
					paddingRight: 24,
					paddingTop: 64,
					paddingBottom: 64,
				}}
			>
				{props.children}
			</div>
			<div
				style={{
					flexShrink: 0,
					borderTopWidth: 1,
					borderColor: footerRule(),
				}}
			>
				<Show
					when={props.link}
					keyed
					fallback={<FooterLabel name={props.name} linked={false} />}
				>
					{(link: () => void) => (
						<div
							{...buttonProps({ onClick: link }, renderer)}
							role="link"
							aria-label={`View ${props.name} documentation`}
							testId={`${props.testId}-link`}
							style={{
								group: true,
								borderBottomLeftRadius: 11,
								borderBottomRightRadius: 11,
								keyboardFocusDim: false,
								hover: { backgroundColor: color.hover },
								focusVisible: {
									outlineWidth: 1,
									outlineColor: color.focusRing,
									outlineOffset: -1,
								},
							}}
						>
							<FooterLabel name={props.name} linked />
						</div>
					)}
				</Show>
			</div>
		</div>
	);
}

function FooterLabel(props: { name: string; linked: boolean }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				paddingLeft: 16,
				paddingRight: 16,
				paddingTop: 12,
				paddingBottom: 12,
			}}
		>
			<text
				style={{
					...siteType.body,
					fontWeight: weight.normal,
					color: color.mutedForeground,
					...(props.linked
						? {
								...fade(["color"], 80),
								groupHover: { color: color.foreground },
							}
						: {}),
				}}
			>
				{props.name}
			</text>
		</div>
	);
}
