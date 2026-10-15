import {
	type BoxShadow,
	createWindowSize,
	DialogPopup,
	DialogPortal,
	Dialog as GpuixDialog,
	DialogClose as GpuixDialogClose,
	DialogDescription as GpuixDialogDescription,
	DialogTitle as GpuixDialogTitle,
	DialogTrigger as GpuixDialogTrigger,
	type EventPayload,
	type HostElement,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { isInside } from "../lib/popup";
import { createPresence } from "../lib/presence";
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
	/** Inside another dialog: the parent's scrim already dims the page. */
	nested: boolean;
	/** Dialogs opened inside this one that are still mounted. */
	openChildren: () => number;
	trackChild: (by: 1 | -1) => void;
	/** A trigger press: closes an open dialog, reopens one that is fading out. */
	pressTrigger: () => void;
	/** The trigger's box, which an outside press must not count as outside. */
	trigger: { current: HostElement | undefined };
	modal: () => boolean;
	setOpen: (open: boolean) => void;
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
	 * Draw the overlay inside the nearest positioned ancestor instead of over the
	 * whole window (the original's `container`). The region must be
	 * `position: relative`; Dialog renders no element of its own.
	 */
	scoped?: boolean;
	children: JSX.Element;
}) {
	const parent = useContext(DialogScopeContext);
	const [uncontrolled, setUncontrolled] = createSignal(
		props.defaultOpen ?? false,
	);
	const shown = () => props.open ?? uncontrolled();
	// onMotionComplete is the primary release; the timer covers an exit that
	// never animates (closed before it ever painted).
	const presence = createPresence(EXIT_FALLBACK_MS, shown());
	presence.follow(shown);
	const mounted = presence.mounted;

	const setOpen = (next: boolean) => {
		// gpuix keeps its layer up through the exit fade, so a second close request (a press on the backdrop or the ✕) can arrive when the dialog is already closed. Nothing to report.
		if (!next && !shown()) return;
		if (props.open === undefined) setUncontrolled(next);
		props.onOpenChange?.(next);
	};

	const [openChildren, setOpenChildren] = createSignal(0);
	if (parent !== undefined) {
		createEffect(
			on(mounted, (isMounted) => parent.trackChild(isMounted ? 1 : -1), {
				defer: true,
			}),
		);
		onCleanup(() => {
			if (mounted()) parent.trackChild(-1);
		});
	}
	const trigger: { current: HostElement | undefined } = { current: undefined };

	const scope: DialogScope = {
		shown,
		mounted,
		scoped: () => props.scoped ?? false,
		finish: presence.release,
		nested: parent !== undefined,
		openChildren,
		trackChild: (by) => setOpenChildren((count) => count + by),
		trigger,
		modal: () => props.modal ?? true,
		setOpen,
		pressTrigger() {
			if (shown()) setOpen(false);
			// Pressed while the exit fade plays: gpuix still sees the dialog open and ignores it.
			else if (mounted()) setOpen(true);
		},
	};

	return (
		<DialogScopeContext.Provider value={scope}>
			<GpuixDialog
				open={mounted()}
				modal={props.modal}
				onOpenChange={setOpen}
			>
				{props.children}
			</GpuixDialog>
		</DialogScopeContext.Provider>
	);
}

/** The single child becomes the trigger, like `render={<Button/>}`. */
export function DialogTrigger(props: { children: JSX.Element }) {
	const scope = useDialogScope();
	return (
		<GpuixDialogTrigger
			asChild
			ref={(element) => {
				scope.trigger.current = element;
			}}
			onClick={scope.pressTrigger}
		>
			{props.children}
		</GpuixDialogTrigger>
	);
}

/**
 * Moves focus from the popup to its first tab stop once it is up, which is
 * where Base UI puts it. gpuix focuses the popup itself.
 */
export function FocusFirst(props: { popup: () => HostElement | undefined }) {
	const renderer = useGpuixRequired();
	onMount(() => {
		const popup = props.popup();
		if (popup === undefined) throw new Error("FocusFirst: the popup is not mounted");
		// A tick later: the tree the popup holds is only committed natively after this mount.
		const timer = setTimeout(() => renderer.focusNextWithin?.(popup.id), 0);
		onCleanup(() => clearTimeout(timer));
	});
	return null;
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

	let popup: HostElement | undefined;
	/** The scoped overlay's box: a trigger outside it is not under the backdrop. */
	let region: HostElement | undefined;
	// gpuix builds the popup's children twice (see `once`), and a second focus step would skip the first tab stop.
	const focusFirst = once(() => <FocusFirst popup={() => popup} />);
	/** A non-modal dialog closes on a press anywhere outside it, except, for a scoped dialog, on a trigger outside the overlay (it toggles the dialog itself) or inside a dialog opened from it. */
	const closeOnOutsidePress = (event: EventPayload) => {
		if (scope.modal() || !scope.shown() || scope.openChildren() > 0) return;
		if (
			scope.scoped() &&
			isInside(event, [scope.trigger.current]) &&
			!isInside(event, [region])
		) {
			return;
		}
		scope.setOpen(false);
	};

	const body = () => (
		<>
			{/* gpuix's own DialogBackdrop closes on mousedown; a backdrop closes on a click that presses and releases on it, as in a browser. */}
			<div
				onClick={() => {
					if (scope.modal()) scope.setOpen(false);
				}}
				style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
			>
				{/* Base UI renders no second backdrop for a nested dialog: the parent's already dims the page. */}
				<Show when={!scope.nested}>
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
						}}
					/>
				</Show>
			</div>
			<DialogPopup
				// Positioned so it paints and hit-tests above the absolute backdrop, which would otherwise take a press inside the dialog and close it.
				style={{ position: "relative", width: "100%", maxWidth: maxWidth() }}
				testId={props.testId}
				ref={(element) => {
					popup = element;
				}}
				onMouseDownOutside={closeOnOutsidePress}
				// Escape while this dialog fades out belongs to the dialog behind it. gpuix hands the key to the top layer once the element handlers have run, so taking this layer down here lets it through.
				onKeyDown={(event) => {
					if (event.key === "Escape" && !scope.shown()) scope.finish();
				}}
			>
				{focusFirst()}
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
									aria-label="Close"
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
					ref={(element) => {
						region = element;
					}}
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
