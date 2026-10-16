import type { EventPayload, HostElement } from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";
import { Icon } from "../lib/icon";
import { color, height, type as scale, weight } from "../lib/theme";
import { separatorColor } from "./menu-item";

export interface DropdownSearchProps {
	/** The query. Filter the rows you render against it. */
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	/** Reset the query when the popup closes, so the menu reopens unfiltered. Defaults to `true`. */
	clearOnClose?: boolean;
	/** Take focus when the popup opens. Defaults to `true`. */
	autoFocus?: boolean;
}

/**
 * The field is part of the popup's chrome, above the scroller, and cannot sit
 * among the rows (gpuix has no `position: sticky`), so `DropdownSearch` hands
 * its props to the content and renders nothing itself.
 */
export interface DropdownSearchHost {
	register: (props: DropdownSearchProps) => () => void;
}

export const DropdownSearchHostContext = createContext<DropdownSearchHost>();

export function DropdownSearch(props: DropdownSearchProps) {
	const host = useContext(DropdownSearchHostContext);
	if (host === undefined) {
		throw new Error("DropdownSearch must be inside a DropdownContent");
	}
	createEffect(() => {
		onCleanup(host.register(props));
	});
	return null;
}

export function DropdownEmpty(props: { children: string }) {
	return (
		<div
			role="status"
			style={{
				paddingLeft: 8,
				paddingRight: 8,
				paddingTop: 24,
				paddingBottom: 24,
				display: "flex",
				justifyContent: "center",
			}}
		>
			<text style={{ ...scale.body, color: color.mutedForeground }}>
				{props.children}
			</text>
		</div>
	);
}

export const SEARCH_HEIGHT = height.control;

/** The field row `DropdownContent` draws above its rows. */
export function SearchField(props: {
	search: DropdownSearchProps;
	/** The list moves focus here: back from past either end of the rows, or when a key typed on a row goes into the query. */
	fieldRef: (element: HostElement) => void;
	testId?: string;
}) {
	const [focused, setFocused] = createSignal(false);
	return (
		<div
			style={{
				height: SEARCH_HEIGHT,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: 12,
				paddingRight: 12,
				borderBottomWidth: 1,
				borderColor: separatorColor(),
			}}
		>
			<Icon
				name="search"
				size={16}
				strokeWidth={focused() ? 2 : 1.5}
				color={focused() ? color.foreground : color.mutedForeground}
			/>
			<input
				ref={(element) => {
					props.fieldRef(element);
				}}
				testId={props.testId}
				role="searchbox"
				autoFocus={props.search.autoFocus ?? true}
				value={props.search.value}
				placeholder={props.search.placeholder ?? "Search…"}
				theme={{
					text: color.foreground,
					textMuted: color.mutedForeground,
					textFaint: color.mutedForeground,
					textDim: color.mutedForeground,
					caret: color.foreground,
				}}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onChange={(event: EventPayload) => {
					if (event.value === undefined) {
						throw new Error("Search change without a value");
					}
					props.search.onValueChange(event.value);
				}}
				style={{
					flexGrow: 1,
					minWidth: 0,
					height: 24,
					fontSize: scale.body.fontSize,
					fontWeight: weight.normal,
					color: color.foreground,
					backgroundColor: color.transparent,
					keyboardFocusDim: false,
				}}
			/>
		</div>
	);
}
