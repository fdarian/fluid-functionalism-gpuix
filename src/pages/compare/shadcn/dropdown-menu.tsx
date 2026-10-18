import { For, Show } from 'solid-js';
import type { IconName } from '#/lib/icons';
import { twShadow } from '#/lib/theme';
import { LUCIDE, LucideIcon, lucideGlyph, pressProps } from './parts';
import { sc, scRadius } from './theme';

/**
 * The preview's static-open `DropdownMenu`: the content markup with no portal, so it sits inside the shadcn scope.
 * Radio items with a check in the left gutter, an icon and a label; a hover fills the row with the accent.
 */
export function ScDropdownMenu(props: {
	items: readonly { value: string; icon: IconName; label: string }[];
	value: string;
	onValueChange: (value: string) => void;
	testId?: string;
}) {
	return (
		<div
			role="menu"
			testId={props.testId}
			style={{
				alignSelf: 'center',
				display: 'flex',
				flexDirection: 'column',
				minWidth: 224,
				padding: 4,
				borderRadius: scRadius.md,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: sc.border,
				backgroundColor: sc.popover,
				boxShadow: twShadow.md,
			}}
		>
			<For each={props.items}>
				{(item) => {
					const selected = () => props.value === item.value;
					return (
						<div
							{...pressProps({
								onClick: () => props.onValueChange(item.value),
							})}
							role="menuitemradio"
							aria-checked={selected()}
							testId={
								props.testId === undefined
									? undefined
									: `${props.testId}-${item.value}`
							}
							style={{
								position: 'relative',
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								gap: 8,
								paddingTop: 8,
								paddingBottom: 8,
								paddingLeft: 32,
								paddingRight: 8,
								borderRadius: scRadius.sm,
								keyboardFocusDim: false,
								hover: { backgroundColor: sc.accent },
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: 8,
									top: 0,
									bottom: 0,
									width: 14,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<Show when={selected()}>
									<LucideIcon
										name={LUCIDE.check}
										size={14}
										strokeWidth={2}
										color={sc.popoverForeground}
									/>
								</Show>
							</div>
							<LucideIcon
								name={lucideGlyph(item.icon)}
								size={16}
								strokeWidth={2}
								color={sc.popoverForeground}
							/>
							<text
								style={{
									fontSize: 13,
									lineHeight: '19.5px',
									fontWeight: 400,
									whiteSpace: 'nowrap',
									color: sc.popoverForeground,
								}}
							>
								{item.label}
							</text>
						</div>
					);
				}}
			</For>
		</div>
	);
}
