import { For } from 'solid-js';
import { SidebarMenu, SidebarMenuButton } from '#/components/sidebar';
import { monthLabel } from '#/lib/changelog/migration-prompt';
import type { Release } from '#/lib/changelog/parse';
import { color, shape, siteType, weight } from '#/lib/theme';
import { activeMonth, scrollToMonth } from './release-spy';

/**
 * The right rail's only card on the changelog: one row per month, the one in
 * view filled and bold. It is the sidebar's menu, so the fill glides between
 * months and the hover follows the pointer the same way.
 */
export function ReleaseIndexCard(props: { releases: readonly Release[] }) {
	return (
		<div
			role="complementary"
			aria-label="Releases"
			style={{
				display: 'flex',
				flexDirection: 'column',
				padding: 16,
				borderRadius: shape.container,
				backgroundColor: color.muted,
			}}
		>
			{/* The same header as "Make them yours": 8px above and below a 28px row, the title centred in it. */}
			<div style={{ paddingTop: 8, paddingBottom: 8 }}>
				<div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
					<text
						style={{
							...siteType.title,
							fontWeight: weight.semibold,
							color: color.foreground,
						}}
					>
						Releases
					</text>
				</div>
			</div>
			{/* The 32px rows start 10px under the header, which puts the first month's text as far under the title as "Theme" sits; -8px each side lets the fill reach past the text's column. */}
			<div style={{ marginTop: 10, marginLeft: -8, marginRight: -8 }}>
				<SidebarMenu testId="release-index">
					<For each={props.releases}>
						{(release) => (
							<SidebarMenuButton
								testId={`release-row-${release.month}`}
								label={monthLabel(release.month)}
								active={activeMonth() === release.month}
								onClick={() => scrollToMonth(release.month)}
							/>
						)}
					</For>
				</SidebarMenu>
			</div>
		</div>
	);
}
