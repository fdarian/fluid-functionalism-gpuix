import { For, type JSX } from "solid-js";
import { CustomizeCard } from "../../app";
import { NavItem } from "../../components/nav-item";
import { NavMenu } from "../../components/nav-menu";
import { ScrollArea } from "../../components/scroll-area";
import { SHOWCASE_SLUG } from "../../lib/demo";
import { usePageNav } from "../../lib/page-nav";
import { color } from "../../lib/theme";

export const CONCEPTS = [
	{ slug: "concepts-lumen", name: "Lumen" },
	{ slug: "concepts-atlas", name: "Atlas" },
	{ slug: "concepts-beacon", name: "Beacon" },
	{ slug: "concepts-quill", name: "Quill" },
] as const;

const NAV_WIDTH = 224;
const PANEL_WIDTH = 296;

/**
 * The chrome around every concept screen: a left nav to jump between
 * concepts (Home first), the screen in the middle column and the customise
 * card on the right. The screen fills the column's height and scrolls
 * itself.
 */
export function ConceptFrame(props: {
	children: JSX.Element;
	/** Only the content: no concept nav or customise card. The `/concepts` index is the hub itself. */
	bare?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				width: "100%",
				height: "100%",
				backgroundColor: color.background,
			}}
		>
			{props.bare === true ? null : <ConceptNav />}
			<div
				style={{
					flexGrow: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
				}}
			>
				{props.children}
			</div>
			{props.bare === true ? null : (
				<div style={{ width: PANEL_WIDTH, flexShrink: 0 }}>
					<ScrollArea height="100%" fade>
						<div style={{ padding: 16 }}>
							<CustomizeCard />
						</div>
					</ScrollArea>
				</div>
			)}
		</div>
	);
}

function ConceptNav() {
	const nav = usePageNav();
	return (
		<div style={{ width: NAV_WIDTH, flexShrink: 0 }}>
			<ScrollArea height="100%" fade>
				<div style={{ padding: 16 }}>
					<NavMenu activeSlug={nav.current()} aria-label="Concept screens">
						<NavItem
							index={0}
							slug={SHOWCASE_SLUG}
							label="Home"
							icon="home"
							testId="concept-nav-home"
							onClick={() => nav.navigate(SHOWCASE_SLUG)}
						/>
						<For each={CONCEPTS}>
							{(concept, index) => (
								<NavItem
									index={index() + 1}
									slug={concept.slug}
									label={concept.name}
									testId={`concept-nav-${concept.slug}`}
									onClick={() => nav.navigate(concept.slug)}
								/>
							)}
						</For>
					</NavMenu>
				</div>
			</ScrollArea>
		</div>
	);
}
