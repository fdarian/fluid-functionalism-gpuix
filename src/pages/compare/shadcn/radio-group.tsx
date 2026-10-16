import {
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from "@gpuix/solid";
import { For, Show } from "solid-js";
import { LUCIDE, LucideIcon, pressProps, ScLabel } from "./parts";
import { sc, scRing } from "./theme";

/** `components/shadcn/radio-group.tsx`: a `grid gap-2` of round items, each with its `Label`. */
export function ScRadioGroup(props: {
	items: readonly { value: string; label: string }[];
	value: string;
	onValueChange: (value: string) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const elements: HostElement[] = [];
	const selectedIndex = () =>
		props.items.findIndex((item) => item.value === props.value);

	/** Arrows move focus, and Radix selects whatever takes it. */
	const step = (from: number, by: number) => {
		const index = (from + by + props.items.length) % props.items.length;
		const target = elements[index];
		const item = props.items[index];
		if (target === undefined || item === undefined) {
			throw new Error(`There is no radio item ${index}`);
		}
		if (renderer.focusElement === undefined) {
			throw new Error("This renderer cannot move focus");
		}
		renderer.focusElement(target.id);
		props.onValueChange(item.value);
	};
	const onKeyDown = (index: number) => (event: KeyEvent) => {
		const by =
			event.key === "ArrowDown" || event.key === "ArrowRight"
				? 1
				: event.key === "ArrowUp" || event.key === "ArrowLeft"
					? -1
					: 0;
		if (by === 0) return;
		event.preventDefault();
		step(index, by);
	};

	return (
		<div
			role="radiogroup"
			testId={props.testId}
			style={{ display: "flex", flexDirection: "column", gap: 8 }}
		>
			<For each={props.items}>
				{(item, index) => (
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
						}}
					>
						<div
							ref={(element) => {
								elements[index()] = element;
							}}
							{...pressProps({
								onClick: () => props.onValueChange(item.value),
								enter: false,
								// The checked item holds the tab stop; with none checked, the first does.
								tabIndex:
									item.value === props.value ||
									(selectedIndex() === -1 && index() === 0)
										? 0
										: -1,
								onKeyDown: onKeyDown(index()),
							})}
							role="radio"
							aria-checked={item.value === props.value}
							testId={
								props.testId === undefined
									? undefined
									: `${props.testId}-${item.value}`
							}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
								width: 16,
								height: 16,
								borderRadius: 8,
								borderWidth: 1,
								borderColor: sc.primary,
								keyboardFocusDim: false,
								focusVisible: scRing(),
							}}
						>
							<Show when={item.value === props.value}>
								<LucideIcon
									name={LUCIDE.circle}
									size={10}
									strokeWidth={2}
									color={sc.primary}
								/>
							</Show>
						</div>
						<ScLabel onClick={() => props.onValueChange(item.value)}>
							{item.label}
						</ScLabel>
					</div>
				)}
			</For>
		</div>
	);
}
