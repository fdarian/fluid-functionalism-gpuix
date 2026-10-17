import { buttonProps, type KeyEvent, useGpuixRequired } from '@gpuix/solid';
import { Icon } from '#/lib/icon';
import { defineIcon, type IconName } from '#/lib/icons';
import { lucide } from '#/lib/icons/lucide';
import { weight } from '#/lib/theme';
import { sc } from './theme';

/** shadcn imports `lucide-react` directly, so these stay Lucide whichever library the Icons row picks. */
export const LUCIDE = {
	check: defineIcon(lucide.check),
	chevronDown: defineIcon(lucide['chevron-down']),
	chevronUp: defineIcon('<path d="m18 15-6-6-6 6"/>'),
	circle: defineIcon('<circle cx="12" cy="12" r="10" fill="currentColor"/>'),
};

export function lucideGlyph(name: IconName) {
	return defineIcon(lucide[name]);
}

export { Icon as LucideIcon };

/** `text-sm font-medium leading-none`, or `text-xs` for the input labels. */
export function ScLabel(props: {
	children: string;
	size?: 12 | 14;
	onClick?: () => void;
}) {
	return (
		<div onClick={props.onClick}>
			<text
				style={{
					fontSize: props.size ?? 14,
					lineHeight: `${props.size ?? 14}px`,
					fontWeight: weight.medium,
					color: sc.foreground,
					whiteSpace: 'nowrap',
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

/**
 * Radix's buttons: a press, Enter on key down and Space on key up all click. Spread it, then set the `role`.
 * `enter: false` is for the primitives that leave Enter alone (checkbox, radio).
 */
export function pressProps(options: {
	onClick: () => void;
	enter?: boolean;
	tabIndex?: number;
	onKeyDown?: (event: KeyEvent) => void;
}) {
	const renderer = useGpuixRequired();
	return buttonProps(
		{
			onClick: options.onClick,
			tabIndex: options.tabIndex,
			onKeyDown(event: KeyEvent) {
				options.onKeyDown?.(event);
				if (options.enter === false && event.key === 'Enter') {
					event.preventDefault();
				}
			},
		},
		renderer,
	);
}
