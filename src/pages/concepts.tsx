import { For } from "solid-js";
import { NavItem } from "../components/nav-item";
import { NavMenu } from "../components/nav-menu";
import type { ShotContext } from "../lib/demo";
import { usePageNav } from "../lib/page-nav";
import { CONCEPTS, ConceptFrame } from "./concepts/frame";

export const title = "Concepts";
export const group = "Pages";
export const order = 30;
export const layout = "full";
export const listed = "menu";
export const menuKeywords = ["concepts", "mockups"];

export async function scenarios(shot: ShotContext) {
	await shot.hover("concepts-index-concepts-beacon");
	shot.capture("hover");
}

export function Page() {
	const nav = usePageNav();
	return (
		<ConceptFrame bare>
			<div
				style={{
					flexGrow: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					paddingLeft: 24,
					paddingRight: 24,
				}}
			>
				<div style={{ width: 224 }}>
					<NavMenu activeSlug={null} aria-label="Concepts">
						<For each={CONCEPTS}>
							{(concept, index) => (
								<NavItem
									index={index()}
									slug={concept.slug}
									label={concept.name}
									testId={`concepts-index-${concept.slug}`}
									onClick={() => nav.navigate(concept.slug)}
								/>
							)}
						</For>
					</NavMenu>
				</div>
			</div>
		</ConceptFrame>
	);
}
