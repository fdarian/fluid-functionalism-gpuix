import {
	type BoxShadow,
	createWindowSize,
	DialogBackdrop,
	DialogPopup,
	DialogPortal,
	Dialog as GpuixDialog,
	DialogClose as GpuixDialogClose,
	DialogDescription as GpuixDialogDescription,
	DialogTitle as GpuixDialogTitle,
	DialogTrigger as GpuixDialogTrigger,
	motion,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import {
	color,
	radius,
	type as scale,
	scheme,
	motion as tween,
	weight,
} from "../lib/theme";
import { Button } from "./button";

export type DialogSize = "sm" | "lg" | "xl";
export type DialogPosition = "center" | "top";

/** Width per size, one notch narrower in compact regions (the size ladder). */
const widths = {
	sm: { default: 400, compact: 360 },
	lg: { default: 540, compact: 480 },
	xl: { default: 880, compact: 800 },
} as const;

/** Space the panel keeps from the window edge: `w-[calc(100%-2rem)]`. */
const EDGE = 16;

/** The exit tween plus a buffer: `exitFallbackMs(spring.slow)`. */
const EXIT_FALLBACK_MS = 260;

/** `top-[12dvh]` */
const TOP_OFFSET = 0.12;

interface DialogScope {
	/** The target: the panel springs in while true and fades out while false. */
	shown: () => boolean;
	/** Outlives `shown` by the exit fade, so the layer stays up while it plays. */
	mounted: () => boolean;
	scoped: () => boolean;
	/** The exit fade ended: take the layer down. */
	finish: () => void;
}

const DialogScopeContext = createContext<DialogScope>();

function useDialogScope() {
	const scope = useContext(DialogScopeContext);
	if (scope === undefined) throw new Error("Must be used inside Dialog");
	return scope;
}

/**
 * Composed from gpuix's headless `Dialog`, which already paints a
 * window-sized layer after the page, traps Tab, closes on Escape and the
 * backdrop, and hands focus back to the trigger. It unmounts the moment it
 * closes, so `mounted` holds it open for the exit fade (Base UI's
 * `preventUnmountOnClose` in the original).
 */
export function Dialog(props: {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Block the page behind and keep Tab inside. */
	modal?: boolean;
	/**
	 * Draw the overlay inside the parent element instead of over the whole window
	 * (the original's `container`). gpuix places an absolute child against its
	 * parent, not the nearest positioned ancestor, so `DialogContent` must be a
	 * direct child of the region: Dialog renders no element of its own.
	 */
	scoped?: boolean;
	children: JSX.Element;
}) {
	const [uncontrolled, setUncontrolled] = createSignal(
		props.defaultOpen ?? false,
	);
	const shown = () => props.open ?? uncontrolled();
	const [mounted, setMounted] = createSignal(shown());
	createEffect(
		on(
			shown,
			(isShown) => {
				if (isShown) {
					setMounted(true);
					return;
				}
				// onMotionComplete is the primary release; this covers an exit that
				// never animates (closed before it ever painted).
				const timer = setTimeout(() => setMounted(false), EXIT_FALLBACK_MS);
				onCleanup(() => clearTimeout(timer));
			},
			{ defer: true },
		),
	);

	const setOpen = (next: boolean) => {
		if (props.open === undefined) setUncontrolled(next);
		props.onOpenChange?.(next);
	};

	const scope: DialogScope = {
		shown,
		mounted,
		scoped: () => props.scoped ?? false,
		finish: () => setMounted(false),
	};

	return (
		<DialogScopeContext.Provider value={scope}>
			<GpuixDialog open={mounted()} modal={props.modal} onOpenChange={setOpen}>
				{props.children}
			</GpuixDialog>
		</DialogScopeContext.Provider>
	);
}

/** The single child becomes the trigger, like `render={<Button/>}`. */
export function DialogTrigger(props: { children: JSX.Element }) {
	return <GpuixDialogTrigger asChild>{props.children}</GpuixDialogTrigger>;
}

export function DialogClose(props: { children: JSX.Element }) {
	return <GpuixDialogClose asChild>{props.children}</GpuixDialogClose>;
}

/**
 * Builds `make()` once per mount and hands the same value back until the
 * mounting scope is disposed. gpuix's `DialogPortal` evaluates its children
 * twice (`dialog.ts:117` spreads them, `dialog.ts:137` reads them again), so
 * the content would otherwise exist twice and the discarded copy keep its
 * timers and listeners alive.
 */
export function once<Value>(make: () => Value): () => Value {
	let made: { value: Value } | undefined;
	return () => {
		if (made === undefined) {
			made = { value: make() };
			// The portal remounts on every open: a copy from the last open is dead.
			onCleanup(() => {
				made = undefined;
			});
		}
		return made.value;
	};
}

/**
 * surface-5's shadow: a 1px ring plus drops up to 12px. gpuix paints one
 * outer shadow, so the ring is the border and the largest drop is kept.
 */
function shadow5(): BoxShadow {
	return {
		offsetX: 0,
		offsetY: 12,
		blurRadius: 12,
		spreadRadius: -6,
		color: color.shadowColor,
	};
}

export function DialogContent(props: {
	size?: DialogSize;
	/** One notch narrower, like a dialog opened from a compact region. */
	compact?: boolean;
	/** The ✕ in the top-right corner. */
	showCloseButton?: boolean;
	/** Centred, or anchored 12% from the top so a content-sized panel keeps its top edge still. */
	position?: DialogPosition;
	testId?: string;
	children: JSX.Element;
}) {
	const scope = useDialogScope();
	const content = once(() => props.children);
	const windowSize = createWindowSize();
	const maxWidth = () =>
		widths[props.size ?? "sm"][props.compact ? "compact" : "default"];
	const top = () => (props.position ?? "center") === "top";
	const topOffset = () =>
		scope.scoped() ? 24 : Math.round(windowSize().height * TOP_OFFSET);

	const layerStyle = () =>
		({
			display: "flex",
			alignItems: top() ? "flex-start" : "center",
			justifyContent: "center",
			paddingLeft: EDGE,
			paddingRight: EDGE,
			paddingTop: top() ? topOffset() : 0,
			overflow: "hidden",
		}) as const;

	const body = () => (
		<>
			<DialogBackdrop>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: scope.shown() ? 1 : 0 }}
					transition={scope.shown() ? tween.slow : tween.slowExit}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: color.scrim,
						// A filled child would swallow the press meant for the backdrop behind it.
						pointerEvents: "none",
					}}
				/>
			</DialogBackdrop>
			<DialogPopup
				style={{ width: "100%", maxWidth: maxWidth() }}
				testId={props.testId}
			>
				{/* The original also scales 0.97 to 1; gpuix has no transforms, so the panel only fades. */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: scope.shown() ? 1 : 0 }}
					transition={scope.shown() ? tween.slow : tween.slowExit}
					onMotionComplete={() => {
						if (!scope.shown()) scope.finish();
					}}
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						padding: 24,
						borderRadius: radius.container,
						backgroundColor: color.surface5,
						borderWidth: 1,
						borderColor: color.popupBorder,
						boxShadow: shadow5(),
					}}
				>
					{content()}
					<Show when={props.showCloseButton ?? true}>
						<div style={{ position: "absolute", top: 12, right: 12 }}>
							<DialogClose>
								<Button
									variant="ghost"
									size="icon-compact"
									icon="x"
									testId="dialog-close"
								/>
							</DialogClose>
						</div>
					</Show>
				</motion.div>
			</DialogPopup>
		</>
	);

	return (
		<Show
			when={scope.scoped()}
			fallback={<DialogPortal style={layerStyle()}>{body()}</DialogPortal>}
		>
			<Show when={scope.mounted()}>
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: "auto",
						...layerStyle(),
					}}
				>
					{body()}
				</div>
			</Show>
		</Show>
	);
}

export function DialogHeader(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 6,
				marginBottom: 16,
			}}
		>
			{props.children}
		</div>
	);
}

export function DialogFooter(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				justifyContent: "flex-end",
				gap: 8,
				marginTop: 24,
			}}
		>
			{props.children}
		</div>
	);
}

export function DialogTitle(props: { compact?: boolean; children: string }) {
	return (
		<GpuixDialogTitle>
			<text
				style={{
					...(props.compact ? { fontSize: 15, lineHeight: 20 } : scale.title),
					color: color.foreground,
					fontWeight: weight.semibold,
				}}
			>
				{props.children}
			</text>
		</GpuixDialogTitle>
	);
}

export function DialogDescription(props: {
	compact?: boolean;
	children: string;
}) {
	return (
		<GpuixDialogDescription>
			<text
				style={{
					...(props.compact ? scale.bodyCompact : scale.body),
					color: color.mutedForeground,
				}}
			>
				{props.children}
			</text>
		</GpuixDialogDescription>
	);
}
