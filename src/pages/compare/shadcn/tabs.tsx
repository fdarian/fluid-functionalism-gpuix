import {
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from "@gpuix/solid";
import { For } from "solid-js";
import { twShadow, weight } from "#/lib/theme";
import { pressProps } from "./parts";
import { sc, scRadius, scRing } from "./theme";

/**
 * `components/shadcn/tabs.tsx`: an `h-10` muted pill list holding triggers, the active one raised on the
 * background. Radix activates on focus, so arrows (and Home / End) move focus and select together.
 */
export function ScTabs(props: {
	items: readonly { value: string; label: string }[];
	value: string;
	onValueChange: (value: string) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const elements: HostElement[] = [];

	const select = (index: number) => {
		const target = elements[index];
		const item = props.items[index];
		if (target === undefined || item === undefined) {
			throw new Error(`There is no tab ${index}`);
		}
		if (renderer.focusElement === undefined) {
			throw new Error("This renderer cannot move focus");
		}
		renderer.focusElement(target.id);
		props.onValueChange(item.value);
	};
	const onKeyDown = (index: number) => (event: KeyEvent) => {
		const last = props.items.length - 1;
		const target =
			event.key === "ArrowRight"
				? index === last
					? 0
					: index + 1
				: event.key === "ArrowLeft"
					? index === 0
						? last
						: index - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? last
							: undefined;
		if (target === undefined) return;
		event.preventDefault();
		select(target);
	};

	return (
		<div
			role="tablist"
			testId={props.testId}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				height: 40,
				padding: 4,
				borderRadius: scRadius.md,
				backgroundColor: sc.muted,
			}}
		>
			<For each={props.items}>
				{(item, index) => {
					const active = () => item.value === props.value;
					return (
						<div
							ref={(element) => {
								elements[index()] = element;
							}}
							{...pressProps({
								onClick: () => props.onValueChange(item.value),
								tabIndex: active() ? 0 : -1,
								onKeyDown: onKeyDown(index()),
							})}
							role="tab"
							aria-selected={active()}
							testId={
								props.testId === undefined
									? undefined
									: `${props.testId}-${item.value}`
							}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								paddingLeft: 12,
								paddingRight: 12,
								paddingTop: 6,
								paddingBottom: 6,
								borderRadius: scRadius.sm,
								backgroundColor: active() ? sc.background : "rgba(0,0,0,0)",
								boxShadow: active() ? twShadow.sm : undefined,
								transitionProperty: "background-color",
								transitionDuration: "150ms",
								transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
								keyboardFocusDim: false,
								focusVisible: scRing(),
							}}
						>
							<text
								style={{
									fontSize: 14,
									lineHeight: 20,
									fontWeight: weight.medium,
									whiteSpace: "nowrap",
									color: active() ? sc.foreground : sc.mutedForeground,
									transitionProperty: "color",
									transitionDuration: "150ms",
									transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
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
