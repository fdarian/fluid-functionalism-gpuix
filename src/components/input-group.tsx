import { type HostElement, useGpuixRequired } from '@gpuix/solid';
import {
	type Accessor,
	createContext,
	createSignal,
	type JSX,
	Show,
	useContext,
} from 'solid-js';
import {
	createFluidHover,
	type FluidHover,
	useHoverItem,
} from '#/lib/fluid-hover';
import { Icon } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import {
	color,
	colorFade,
	height,
	type as scale,
	shape,
	sizeChoice,
	weight,
	withAlpha,
} from '#/lib/theme';

export type InputSize = 'default' | 'compact';

const steps = {
	default: {
		height: height.control,
		padX: 10,
		gap: 8,
		icon: 16,
		labelInset: 10,
		text: scale.body,
		caption: scale.caption,
	},
	compact: {
		height: height.controlCompact,
		padX: 8,
		gap: 4,
		icon: 14,
		labelInset: 8,
		text: scale.bodyCompact,
		caption: scale.captionCompact,
	},
} as const;

/** `bg-destructive-light/60` and `ring-destructive/50`. */
const errorWash = () => withAlpha(color.destructiveLight, 0.6);
const errorRing = () => withAlpha(color.destructive, 0.5);

type GroupScope = {
	hover: FluidHover;
	size: () => InputSize;
};

const GroupContext = createContext<GroupScope>();

function useGroup(): GroupScope {
	const scope = useContext(GroupContext);
	if (scope === undefined) {
		throw new Error('InputField must be used within an InputGroup');
	}
	return scope;
}

/**
 * Stacked labelled fields sharing one fluid hover scope. There is no
 * highlight element: the field nearest the pointer draws its own fill and ring.
 */
export function InputGroup(props: {
	/** Pins every field to one step of the size ladder. */
	size?: InputSize;
	children: JSX.Element;
}) {
	const hover = createFluidHover();
	const scope: GroupScope = {
		hover,
		size: () => props.size ?? sizeChoice(),
	};
	return (
		<GroupContext.Provider value={scope}>
			<div
				{...hover.containerProps}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					gap: 12,
					width: 288,
					minWidth: 0,
					flexShrink: 1,
				}}
			>
				{props.children}
			</div>
		</GroupContext.Provider>
	);
}

export function InputField(props: {
	label: string;
	/** Keeps the field's accessible name but draws no label. */
	labelHidden?: boolean;
	placeholder?: string;
	icon?: IconRef;
	/** Position within the group. */
	index: number;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	disabled?: boolean;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const group = useGroup();
	const step = () => steps[group.size()];
	const [focused, setFocused] = createSignal(false);
	let rootElement: HostElement | undefined;
	let inputElement: HostElement | undefined;

	useHoverItem(
		group.hover,
		() => props.index,
		() => rootElement,
	);

	const active = () => group.hover.activeIndex() === props.index;
	const lit = () => active() || focused();

	/** First match wins: disabled, error, focused, hovered, rest. */
	const fill = () => {
		if (props.disabled) return { bg: color.transparent, ring: color.border };
		if (props.error !== undefined) {
			if (focused()) return { bg: color.card, ring: errorRing() };
			if (active()) return { bg: errorWash(), ring: errorRing() };
			return { bg: color.transparent, ring: color.transparent };
		}
		if (focused()) return { bg: color.card, ring: color.border };
		if (active()) return { bg: color.mutedHalf, ring: color.border };
		return { bg: color.transparent, ring: color.transparent };
	};

	const focusInput = () => {
		if (inputElement === undefined) {
			throw new Error('InputField input is not mounted');
		}
		renderer.focusElement?.(inputElement.id);
	};

	return (
		<div
			ref={(element) => {
				rootElement = element;
			}}
			testId={props.testId}
			style={{
				display: 'flex',
				flexDirection: 'column',
				cursor: 'text',
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? 'none' : undefined,
			}}
		>
			<Show when={!props.labelHidden}>
				<div
					onClick={focusInput}
					style={{ paddingLeft: step().labelInset, paddingBottom: 4 }}
				>
					<text
						style={{
							...step().text,
							fontVariationSettings: weight.normal,
							color:
								props.error === undefined
									? color.mutedForeground
									: color.destructive,
						}}
					>
						{props.label}
					</text>
				</div>
			</Show>
			<div
				onClick={focusInput}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: step().gap,
					height: step().height,
					paddingLeft: step().padX,
					paddingRight: step().padX,
				}}
			>
				{/* The fill is its own layer, and pass-through: an absolute box paints above its in-flow siblings, as in a browser, so the icon and input are `position: relative` to paint over it, and it must not take the press meant for the input. */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						borderRadius: shape.input,
						outlineWidth: 1,
						outlineStyle: 'solid',
						outlineColor: fill().ring,
						outlineOffset: 0,
						backgroundColor: fill().bg,
						...colorFade,
						pointerEvents: 'none',
					}}
				/>
				<Show when={props.icon}>
					{(name: Accessor<IconRef>) => (
						<div
							style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
						>
							<Icon
								name={name()}
								size={step().icon}
								strokeWidth={lit() ? 2 : 1.5}
								easeStroke
								fade
								color={lit() ? color.foreground : color.mutedForeground}
							/>
						</div>
					)}
				</Show>
				<input
					ref={(element) => {
						inputElement = element;
					}}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-input`
					}
					aria-label={props.label}
					value={props.value}
					placeholder={props.placeholder}
					disabled={props.disabled}
					theme={{
						text: color.foreground,
						textMuted: color.mutedForeground,
						textFaint: color.mutedForeground,
						textDim: color.mutedForeground,
						caret: color.foreground,
					}}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					onChange={(event) => {
						if (event.value === undefined) {
							throw new Error('InputField change without a value');
						}
						props.onChange(event.value);
					}}
					style={{
						position: 'relative',
						flexGrow: 1,
						minWidth: 0,
						height: 24,
						...step().text,
						fontVariationSettings: weight.normal,
						color: color.foreground,
						backgroundColor: color.transparent,
						keyboardFocusDim: false,
					}}
				/>
			</div>
			<Show when={props.error}>
				{(message: Accessor<string>) => (
					<div style={{ paddingLeft: step().labelInset, paddingTop: 4 }}>
						<text
							style={{
								...step().caption,
								fontVariationSettings: weight.normal,
								color: color.destructive,
							}}
						>
							{message()}
						</text>
					</div>
				)}
			</Show>
		</div>
	);
}
