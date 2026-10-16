import {
	createWindowSize,
	DialogBackdrop,
	DialogPopup,
	DialogPortal,
	Dialog as GpuixDialog,
	DialogClose as GpuixDialogClose,
	DialogDescription as GpuixDialogDescription,
	DialogTitle as GpuixDialogTitle,
	DialogTrigger as GpuixDialogTrigger,
	type HostElement,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createSignal,
	createUniqueId,
	type JSX,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { HideOutside } from "#/lib/modal";
import { createPresence } from "#/lib/presence";
import { SurfaceContext, useElevatedSurface } from "#/lib/surface-context";
import {
	color,
	shape,
	sizeChoice,
	type as scale,
	scheme,
	shadow,
	surface,
	motion as tween,
	weight,
} from "#/lib/theme";
import { Button } from "./button";

export type DialogSize = "sm" | "lg" | "xl";
export type DialogPosition = "center" | "top";

/** Width per size, one notch narrower in compact regions (the size ladder). */
const widths = {
	sm: { default: 400, compact: 360 },
	lg: { default: 540, compact: 480 },
	xl: { default: 880, compact: 800 },
} as const;

function isCompact(compact: boolean | undefined) {
	return compact ?? sizeChoice() === "compact";
}

/** Steps above its substrate the panel sits: `DIALOG_OFFSET` in the source. */
const DIALOG_SURFACE_OFFSET = 4;

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
	/** A trigger press: closes an open dialog, reopens one that is fading out. */
	pressTrigger: () => void;
	modal: () => boolean;
	setOpen: (open: boolean) => void;
	popupId: string;
	titleId: string;
	descriptionId: string;
	/** The popup names itself by these only while they are rendered, as Base UI does. */
	hasTitle: () => boolean;
	hasDescription: () => boolean;
	registerTitle: () => void;
	registerDescription: () => void;
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

	const [titles, setTitles] = createSignal(0);
	const [descriptions, setDescriptions] = createSignal(0);
	const hasTitle = () => titles() > 0;
	const hasDescription = () => descriptions() > 0;

	const scope: DialogScope = {
		popupId: createUniqueId(),
		titleId: createUniqueId(),
		descriptionId: createUniqueId(),
		hasTitle,
		hasDescription,
		registerTitle: () => {
			setTitles((count) => count + 1);
			onCleanup(() => setTitles((count) => count - 1));
		},
		registerDescription: () => {
			setDescriptions((count) => count + 1);
			onCleanup(() => setDescriptions((count) => count - 1));
		},
		shown,
		mounted,
		scoped: () => props.scoped ?? false,
		finish: presence.release,
		nested: parent !== undefined,
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
			aria-haspopup="dialog"
			aria-controls={scope.mounted() ? scope.popupId : undefined}
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
		// Not synchronous: native's tab order exists only once the popup has painted (gpuix README, "Dialog"), so `focusNextWithin` from mount finds no stop, and gpuix's own focus on the popup lands after this mount. A synchronous call was tried and left focus on the popup.
		const timer = setTimeout(() => renderer.focusNextWithin?.(popup.id), 0);
		onCleanup(() => clearTimeout(timer));
	});
	return null;
}

export function DialogClose(props: { children: JSX.Element }) {
	return <GpuixDialogClose asChild>{props.children}</GpuixDialogClose>;
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
	const level = useElevatedSurface(DIALOG_SURFACE_OFFSET);
	const windowSize = createWindowSize();
	const maxWidth = () =>
		widths[props.size ?? "sm"][isCompact(props.compact) ? "compact" : "default"];
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

	const body = () => (
		<>
			{/* gpuix's portal sets `pointerEvents: "none"` on a non-modal layer, which would let an outside press reach the page; the scrim opts back in so it takes the press, as the source's backdrop does. */}
			<DialogBackdrop style={{ pointerEvents: "auto" }}>
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
			</DialogBackdrop>
			<DialogPopup
				// Positioned so it paints and hit-tests above the absolute backdrop, which would otherwise take a press inside the dialog and close it.
				style={{ position: "relative", width: "100%", maxWidth: maxWidth() }}
				testId={props.testId}
				id={scope.popupId}
				aria-labelledby={scope.hasTitle() ? scope.titleId : undefined}
				aria-describedby={scope.hasDescription() ? scope.descriptionId : undefined}
				ref={(element) => {
					popup = element;
				}}
				// Escape while this dialog fades out belongs to the dialog behind it. gpuix hands the key to the top layer once the element handlers have run, so taking this layer down here lets it through.
				onKeyDown={(event) => {
					if (event.key === "Escape" && !scope.shown()) scope.finish();
				}}
			>
				<FocusFirst popup={() => popup} />
				<Show when={scope.modal()}><HideOutside popup={() => popup} /></Show>
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
						borderRadius: shape.container,
						backgroundColor: surface(level),
						boxShadow: shadow(level),
					}}
				>
					<SurfaceContext.Provider value={level}>
						{props.children}
					</SurfaceContext.Provider>
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
	const scope = useDialogScope();
	scope.registerTitle();
	return (
		<GpuixDialogTitle id={scope.titleId}>
			<text
				style={{
					...(isCompact(props.compact) ? { fontSize: 15, lineHeight: 20 } : scale.title),
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
	const scope = useDialogScope();
	scope.registerDescription();
	return (
		<GpuixDialogDescription id={scope.descriptionId}>
			<text
				style={{
					...(isCompact(props.compact) ? scale.bodyCompact : scale.body),
					color: color.mutedForeground,
				}}
			>
				{props.children}
			</text>
		</GpuixDialogDescription>
	);
}
