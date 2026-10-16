import { For, type JSX } from 'solid-js';
import {
	Card,
	CardDescription,
	CardGroup,
	CardHeader,
	CardTitle,
} from '#/components/card';
import { Dropdown, MenuItem } from '#/components/dropdown';
import { TabItem, Tabs, TabsList } from '#/components/tabs';
import { ComponentPreview, MONO } from '#/lib/doc-page';
import { color, siteType, weight } from '#/lib/theme';
import { ROWS } from './plain-vs-fluid';
import { AXES_CODE } from './snippets';

const TAB_ITEMS = ['Library', 'Recents', 'Favorites', 'Settings'];

const CARD_ITEMS = [
	{ title: 'Inbox', description: 'Everything new lands here.' },
	{ title: 'Drafts', description: 'Unsent, saved as you type.' },
	{ title: 'Sent', description: 'Delivered and archived.' },
	{ title: 'Trash', description: 'Emptied after 30 days.' },
];

function AxisBlock(props: {
	axis: string;
	hint: string;
	children: JSX.Element;
}) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'baseline',
					gap: 8,
				}}
			>
				<text
					style={{
						fontFamily: MONO,
						fontSize: siteType.caption.fontSize,
						lineHeight: siteType.caption.lineHeight,
						fontWeight: weight.semibold,
						color: color.foreground,
					}}
				>
					{`axis="${props.axis}"`}
				</text>
				<text style={{ ...siteType.caption, color: color.mutedForeground }}>
					{props.hint}
				</text>
			</div>
			{props.children}
		</div>
	);
}

export function AxesDemo() {
	return (
		<ComponentPreview testId="axes-preview" code={AXES_CODE} cull>
			<div
				style={{
					width: '100%',
					maxWidth: 448,
					display: 'flex',
					flexDirection: 'column',
					gap: 32,
				}}
			>
				<AxisBlock axis="x" hint="strips: tabs">
					<Tabs defaultValue={TAB_ITEMS[0]}>
						<TabsList testId="axes-tabs">
							<For each={TAB_ITEMS}>
								{(label) => (
									<TabItem
										testId={`axes-tab-${label}`}
										value={label}
										label={label}
									/>
								)}
							</For>
						</TabsList>
					</Tabs>
				</AxisBlock>
				<AxisBlock axis="y" hint="lists: menus, tables, radios">
					<div style={{ width: 224 }}>
						<Dropdown testId="axes-list">
							<For each={ROWS}>
								{(label, index) => (
									<MenuItem
										testId={`axes-list-${index()}`}
										index={index()}
										label={label}
									/>
								)}
							</For>
						</Dropdown>
					</div>
				</AxisBlock>
				<AxisBlock axis="xy" hint="grids: card groups">
					<CardGroup columns={2} border="outlined" separated testId="axes-grid">
						<For each={CARD_ITEMS}>
							{(item, index) => (
								// A card only joins the highlight when it can be clicked.
								<Card testId={`axes-grid-${index()}`} onClick={() => {}}>
									<CardHeader>
										<CardTitle>{item.title}</CardTitle>
										<CardDescription>{item.description}</CardDescription>
									</CardHeader>
								</Card>
							)}
						</For>
					</CardGroup>
				</AxisBlock>
			</div>
		</ComponentPreview>
	);
}
