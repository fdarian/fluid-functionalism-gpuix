import { For, type JSX } from 'solid-js';
import { MONO, Prose } from '#/lib/doc-page';
import { color, scheme, siteType, weight } from '#/lib/theme';

/** An Inter space at 13px; `Prose` breaks lines on it. */
const SPACE = 3.6;

type Part =
	| string
	| { code: string }
	| { link: string; href: string; after?: string };

/** `Part`s in reading order. A string keeps the spaces the source's JSX has around it. */
export type Parts = readonly Part[];

/** `open <url>`, as a link's click does: gpuix has no `href` and no shell-open call. */
function openUrl(url: string) {
	const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
	Bun.spawn([command, url]);
}

/** The inline code chip: `mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground`. */
function Chip(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.caption,
				fontFamily: MONO,
				color: color.foreground,
				marginLeft: 4,
				marginRight: 4,
				paddingLeft: 4,
				paddingRight: 4,
				paddingTop: 2,
				paddingBottom: 2,
				borderRadius: 4,
				backgroundColor: scheme() === 'light' ? '#EBEBED' : '#2C2C2C',
				whiteSpace: 'nowrap',
			}}
		>
			{props.children}
		</text>
	);
}

/** `text-foreground underline underline-offset-4`, opened in the system browser. */
function ExternalLink(props: {
	href: string;
	children: string;
	after?: string;
}) {
	return (
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<text
				role="link"
				onClick={() => openUrl(props.href)}
				style={{
					...siteType.body,
					color: color.foreground,
					textDecoration: 'underline',
					cursor: 'pointer',
					whiteSpace: 'nowrap',
				}}
			>
				{props.children}
			</text>
			{props.after === undefined ? null : (
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					{props.after}
				</text>
			)}
		</div>
	);
}

interface Item {
	node: JSX.Element;
	/** Whether the source has a space after it. */
	space: boolean;
}

function items(parts: Parts): Item[] {
	const out: Item[] = [];
	for (const part of parts) {
		if (typeof part !== 'string') {
			out.push({
				node:
					'code' in part ? (
						<Chip>{part.code}</Chip>
					) : (
						<ExternalLink href={part.href} after={part.after}>
							{part.link}
						</ExternalLink>
					),
				space: false,
			});
			continue;
		}
		const previous = out[out.length - 1];
		if (/^\s/.test(part) && previous !== undefined) previous.space = true;
		for (const match of part.matchAll(/(\S+)(\s*)/g)) {
			out.push({
				node: <Prose>{match[1]}</Prose>,
				space: match[2].length > 0,
			});
		}
	}
	return out;
}

/**
 * A paragraph with inline code chips and links. A padded chip and a clickable
 * run cannot sit inside a gpuix paragraph, so the sentence is a wrapping row
 * of one item per word (drift/typography.md).
 */
export function Sentence(props: { parts: Parts }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'wrap',
				alignItems: 'center',
			}}
		>
			<For each={items(props.parts)}>
				{(item) => (
					<div style={{ marginRight: item.space ? SPACE : 0 }}>{item.node}</div>
				)}
			</For>
		</div>
	);
}

/** A `list-disc pl-5 marker:text-muted-foreground` list with `gap-1.5`; the text sits 24px in, `pl-1` past the 20px indent. */
export function BulletList(props: { children: JSX.Element }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
			{props.children}
		</div>
	);
}

export function Rule(props: { children: JSX.Element }) {
	return (
		<div style={{ position: 'relative', marginLeft: 24 }}>
			<div
				style={{
					position: 'absolute',
					left: -15,
					top: (siteType.body.lineHeight - 5) / 2,
					width: 5,
					height: 5,
					borderRadius: 2.5,
					backgroundColor: color.mutedForeground,
				}}
			/>
			{props.children}
		</div>
	);
}

/** An `h3` of a section: `text-site-subtitle`, with the `-mb-2` that tucks its line against it. */
export function H3(props: { children: string; marginTop: number }) {
	return (
		<div style={{ marginTop: props.marginTop, marginBottom: -8 }}>
			<text
				style={{
					...siteType.subtitle,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				{props.children}
			</text>
		</div>
	);
}
