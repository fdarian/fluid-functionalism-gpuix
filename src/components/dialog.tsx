import {
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
} from '@gpuix/solid';
import {
	createDialogDescription,
	createDialogPopup,
	createDialogRoot,
	createDialogTitle,
	createDialogTrigger,
	DialogRootContext,
	FocusFirst,
	useDialogRootContext,
} from 'base-ui-solid-gpuix/dialog';
import { HideOutside } from 'base-ui-solid-gpuix/floating-ui-solid/utils';
import { createContext, type JSX, Show, useContext } from 'solid-js';
import { SurfaceContext, useElevatedSurface } from '#/lib/surface-context';
import {
	color,
	type as scale,
	shadow,
	shape,
	sizeChoice,
	surface,
	motion as tween,
	weight,
} from '#/lib/theme';
import { Button } from './button';

export type DialogSize = 'sm' | 'lg' | 'xl';
export type DialogPosition = 'center' | 'top';

/** Width per size, one notch narrower in compact regions (the size ladder). */
const widths = {
	sm: { default: 400, compact: 360 },
	lg: { default: 540, compact: 480 },
	xl: { default: 880, compact: 800 },
} as const;

function isCompact(compact: boolean | undefined) {
	return compact ?? sizeChoice() === 'compact';
}

/** Steps above its substrate the panel sits: `DIALOG_OFFSET` in the source. */
const DIALOG_SURFACE_OFFSET = 4;

/** The exit tween plus a buffer: `exitFallbackMs(spring.slow)`. */
const EXIT_FALLBACK_MS = 260;

/** Set by `Dialog`'s `scoped` prop: the overlay draws inside the nearest positioned ancestor. */
const DialogScopedContext = createContext<() => boolean>();

function useDialogScoped() {
	const scoped = useContext(DialogScopedContext);
	if (scoped === undefined) throw new Error('Must be used inside Dialog');
	return scoped;
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
	const root = createDialogRoot({
		open: () => props.open,
		defaultOpen: props.defaultOpen,
		onOpenChange: (open) => props.onOpenChange?.(open),
		modal: () => props.modal,
		exitMs: EXIT_FALLBACK_MS,
	});

	return (
		<DialogRootContext.Provider value={root}>
			<DialogScopedContext.Provider value={() => props.scoped ?? false}>
				<GpuixDialog
					open={root.mounted()}
					modal={props.modal}
					onOpenChange={root.setOpen}
				>
					{props.children}
				</GpuixDialog>
			</DialogScopedContext.Provider>
		</DialogRootContext.Provider>
	);
}

/** The single child becomes the trigger, like `render={<Button/>}`. */
export function DialogTrigger(props: { children: JSX.Element }) {
	const trigger = createDialogTrigger(useDialogRootContext());
	return (
		<GpuixDialogTrigger asChild {...trigger}>
			{props.children}
		</GpuixDialogTrigger>
	);
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
	const root = useDialogRootContext();
	const scoped = useDialogScoped();
	const popupProps = createDialogPopup(root);
	const level = useElevatedSurface(DIALOG_SURFACE_OFFSET);
	const maxWidth = () =>
		widths[props.size ?? 'sm'][
			isCompact(props.compact) ? 'compact' : 'default'
		];
	const top = () => (props.position ?? 'center') === 'top';
	const topOffset = () => (scoped() ? 24 : '12vh');

	const layerStyle = () =>
		({
			display: 'flex',
			flexDirection: 'row',
			alignItems: top() ? 'flex-start' : 'center',
			justifyContent: 'center',
			paddingTop: top() ? topOffset() : 0,
			overflow: 'hidden',
		}) as const;

	let popup: HostElement | undefined;

	const body = () => (
		<>
			{/* gpuix's portal sets `pointerEvents: "none"` on a non-modal layer, which would let an outside press reach the page; the scrim opts back in so it takes the press, as the source's backdrop does. */}
			<DialogBackdrop style={{ pointerEvents: 'auto' }}>
				{/* Base UI renders no second backdrop for a nested dialog: the parent's already dims the page. */}
				<Show when={!root.nested}>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: root.shown() ? 1 : 0 }}
						transition={root.shown() ? tween.slow : tween.slowExit}
						style={{
							position: 'absolute',
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
				style={{
					position: 'relative',
					width: 'calc(100% - 2rem)',
					maxWidth: maxWidth(),
				}}
				testId={props.testId}
				{...popupProps}
				ref={(element) => {
					popup = element;
				}}
			>
				<FocusFirst popup={() => popup} />
				<Show when={root.modal()}>
					<HideOutside popup={() => popup} />
				</Show>
				{/* The original also scales 0.97 to 1; gpuix has no transforms, so the panel only fades. */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: root.shown() ? 1 : 0 }}
					transition={root.shown() ? tween.slow : tween.slowExit}
					onMotionComplete={() => {
						if (!root.shown()) root.finish();
					}}
					style={{
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
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
						<div style={{ position: 'absolute', top: 12, right: 12 }}>
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
			when={scoped()}
			fallback={<DialogPortal style={layerStyle()}>{body()}</DialogPortal>}
		>
			<Show when={root.mounted()}>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: 'auto',
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
				display: 'flex',
				flexDirection: 'column',
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
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'flex-end',
				gap: 8,
				marginTop: 24,
			}}
		>
			{props.children}
		</div>
	);
}

export function DialogTitle(props: { compact?: boolean; children: string }) {
	const title = createDialogTitle(useDialogRootContext());
	return (
		<GpuixDialogTitle {...title}>
			<text
				style={{
					...(isCompact(props.compact)
						? { fontSize: 15, lineHeight: '20px' }
						: scale.title),
					color: color.foreground,
					fontVariationSettings: weight.semibold,
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
	const description = createDialogDescription(useDialogRootContext());
	return (
		<GpuixDialogDescription {...description}>
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
