import type { JSX } from 'solid-js';
import { color, linePx, siteType, weight } from '#/lib/theme';

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
					top: (linePx(siteType.body.lineHeight) - 5) / 2,
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
