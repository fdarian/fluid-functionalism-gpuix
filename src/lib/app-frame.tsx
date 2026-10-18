import type { JSX } from 'solid-js';
import { color, fontFamily, type as scale } from './theme';

const BAR_HEIGHT = 40;
const MARGIN = 8;
const PANEL_RADIUS = 10;
const PANEL_BORDER = 1;

/** The page panel's corner radius inside its border. */
export const PANEL_INNER_RADIUS = PANEL_RADIUS - PANEL_BORDER;

/**
 * A browser-style frame: a chrome-coloured window, a title bar under the
 * traffic lights, and the page in a rounded panel.
 */
export function AppFrame(props: { title: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: '100%',
				backgroundColor: color.chrome,
				fontFamily,
			}}
		>
			<div
				style={{
					position: 'relative',
					height: BAR_HEIGHT,
					flexShrink: 0,
					appRegion: 'drag',
				}}
			>
				{/* Full width, so the traffic-light inset does not shift the title. */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<text
						style={{
							...scale.body,
							fontWeight: 500,
							color: color.mutedForeground,
						}}
					>
						{props.title}
					</text>
				</div>
			</div>
			<div
				style={{
					flexGrow: 1,
					minHeight: 0,
					marginLeft: MARGIN,
					marginRight: MARGIN,
					marginBottom: MARGIN,
					borderRadius: PANEL_RADIUS,
					borderStyle: 'solid',
					borderWidth: PANEL_BORDER,
					borderColor: color.border,
					overflow: 'hidden',
					backgroundColor: color.background,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}
