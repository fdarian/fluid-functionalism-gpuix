import {
	AnimatePresence,
	type DomEvent,
	type HostElement,
	type HostPointerEvent,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
import { isChord, moveIndex } from 'base-ui-solid-gpuix/internals/composite';
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	Index,
	type JSX,
	on,
	onCleanup,
	Show,
	untrack,
} from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import { createFluidHover, type ItemRect } from '#/lib/fluid-hover';
import { Icon } from '#/lib/icon';
import { createMeasuredHeight } from '#/lib/measured-height';
import { IS_MAC } from '#/lib/platform';
import { StableLabel } from '#/lib/stable-label';
import {
	color,
	colorFadeNoRing,
	fade,
	focusRing,
	type as scale,
	shape,
	motion as tween,
	weight,
	weightFade,
	withAlpha,
} from '#/lib/theme';
import { Button } from './button';

export interface AskUserOption {
	id?: string;
	title: string;
	description?: string;
}

export interface AskUserQuestion {
	id?: string;
	title: string;
	/** Optional only because a `freeText` question has none. */
	options?: AskUserOption[];
	multiSelect?: boolean;
	allowOther?: boolean;
	otherPlaceholder?: string;
	skippable?: boolean;
	nextLabel?: string;
	/** "inline" keeps title and description together; "stacked" puts the description under the title. */
	layout?: 'inline' | 'stacked';
	/** Which side of the row the numbered chip sits on. */
	chipPosition?: 'left' | 'right';
	/** One multi-line textarea as the whole answer, no option rows. The text is returned in `otherText`. */
	freeText?: boolean;
	freeTextPlaceholder?: string;
	/** Defaults to `true`. `false` is one row tall, and plain Enter submits. */
	freeTextMultiline?: boolean;
	/** Runs on submit; a message blocks it and shows in the footer until the field is edited. */
	freeTextValidate?: (value: string) => string | null | undefined;
}

export interface AskUserAnswer {
	questionId: string;
	selectedIds: string[];
	otherText?: string;
	skipped?: boolean;
}

type Answers = Record<string, AskUserAnswer>;

const NO_OPTIONS: AskUserOption[] = [];
const slowSpring = {
	type: 'spring',
	duration: 0.24,
	bounce: 0.12,
} as const;

const questionKey = (question: AskUserQuestion, index: number) =>
	question.id ?? `q-${index}`;
const optionKey = (option: AskUserOption, index: number) =>
	option.id ?? `o-${index}`;

/** The chip's `transition-[opacity,font-variation-settings] duration-80`; its colours switch at once in the source too. */
const CHIP_FADE = fade(['opacity'], 80);

/** The free-text box's `transition-colors`, without `outline-color`: the source's focus ring is a box-shadow ring, which does not ease. */
const FREE_TEXT_FADE = colorFadeNoRing(150);

const SHORTCUT_GLYPH = IS_MAC ? '⌘↵' : '⌃↵';

/** Keycap for a shortcut, inside the primary button. */
function ShortcutChip(props: { children: string }) {
	return (
		<div
			style={{
				minWidth: 18,
				height: 18,
				paddingLeft: 4,
				paddingRight: 4,
				marginLeft: 2,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: shape.bg,
				// bg-background/15 over the primary button.
				backgroundColor: withAlpha(color.background, 0.15),
			}}
		>
			<text
				style={{ ...scale.micro, lineHeight: '11px', color: color.background }}
			>
				{props.children}
			</text>
		</div>
	);
}

// ─── Option row ───────────────────────────────────────────────────────────

interface RowProps {
	index: number;
	registerItem: (index: number, element: HostElement) => void;
	rowRef: (index: number, element: HostElement) => void;
	role: 'radio' | 'checkbox' | null;
	isSelected: boolean;
	tabIndex: number;
	onClick: () => void;
	onFocus: () => void;
	onBlur: (event: DomEvent) => void;
	chipContent: number;
	chipFilled: boolean;
	isMulti: boolean;
	showArrow: boolean;
	onArrowClick?: () => void;
	bodyLayout: 'inline' | 'stacked';
	topAlign: boolean;
	chipPosition: 'left' | 'right';
	testId?: string;
	children: JSX.Element;
}

/** The submit arrow that covers a row's chip; it grows from 0.6 and shrinks back to it. */
function ArrowOverlay(props: { testId?: string; onClick?: () => void }) {
	return (
		<motion.div
			testId={props.testId === undefined ? undefined : `${props.testId}-arrow`}
			initial={{ opacity: 0, scale: 0.6 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.6, transition: tween.fastExit }}
			transition={{ ...tween.fast, opacity: { duration: 0.08 } }}
			{...(props.onClick
				? {
						role: 'button',
						onClick: (event: HostPointerEvent) => {
							// The row behind the arrow handles clicks too.
							event.stopPropagation();
							props.onClick?.();
						},
					}
				: {})}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: shape.bg,
				backgroundColor: color.foreground,
				cursor: props.onClick ? 'pointer' : 'default',
			}}
		>
			<Icon
				name="arrow-right"
				size={14}
				strokeWidth={2}
				color={color.background}
			/>
		</motion.div>
	);
}

function Row(props: RowProps) {
	let rowElement: HostElement | undefined;
	createEffect(() => {
		if (rowElement === undefined) throw new Error('Row is not mounted');
		props.registerItem(props.index, rowElement);
		props.rowRef(props.index, rowElement);
	});
	const stacked = () => props.bodyLayout === 'stacked';
	const chipNudge = () => (props.topAlign ? (stacked() ? -1 : -5) : 0);

	const arrowOverlay = () => (
		<AnimatePresence>
			<Show when={props.showArrow}>
				<ArrowOverlay testId={props.testId} onClick={props.onArrowClick} />
			</Show>
		</AnimatePresence>
	);

	const chipSlot = () => (
		<div
			style={{
				position: 'relative',
				flexShrink: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 28,
				height: 28,
				marginTop: chipNudge(),
			}}
		>
			<div
				style={{
					position: 'absolute',
					width: 20,
					height: 20,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: shape.bg,
					opacity: props.chipPosition === 'right' && props.showArrow ? 0 : 1,
					...CHIP_FADE,
					...(props.isMulti
						? props.chipFilled
							? { backgroundColor: color.foreground }
							: {
									borderStyle: 'solid',
									borderWidth: 1,
									borderColor: color.border,
								}
						: {}),
				}}
			>
				<text
					style={{
						...scale.micro,
						fontVariationSettings: props.chipFilled
							? weight.semibold
							: weight.normal,
						...weightFade,
						color: props.isMulti
							? props.chipFilled
								? color.background
								: color.mutedForeground
							: props.chipFilled
								? color.foreground
								: color.mutedForeground,
					}}
				>
					{String(props.chipContent)}
				</text>
			</div>
			<Show when={props.chipPosition === 'right'}>{arrowOverlay()}</Show>
		</div>
	);

	const rightArrowSlot = () => (
		<Show when={props.chipPosition === 'left' && !props.isMulti}>
			<div
				style={{
					position: 'relative',
					flexShrink: 0,
					width: 28,
					height: 28,
					marginTop: chipNudge(),
				}}
			>
				{arrowOverlay()}
			</div>
		</Show>
	);

	return (
		<div
			ref={(element) => {
				rowElement = element;
			}}
			testId={props.testId}
			role={props.role ?? undefined}
			aria-checked={props.role === null ? undefined : props.isSelected}
			tabIndex={props.tabIndex}
			onClick={props.onClick}
			onFocus={props.onFocus}
			onBlur={props.onBlur}
			style={{
				position: 'relative',
				zIndex: 10,
				display: 'flex',
				flexDirection: 'row',
				alignItems: props.topAlign ? 'flex-start' : 'center',
				gap: props.chipPosition === 'left' ? 8 : 12,
				minHeight: stacked() ? 56 : 40,
				paddingTop: stacked() ? 8 : 6,
				paddingBottom: stacked() ? 8 : 6,
				paddingLeft: props.chipPosition === 'left' ? 6 : 12,
				paddingRight: props.chipPosition === 'left' && props.isMulti ? 12 : 6,
				borderRadius: shape.item,
				cursor: 'pointer',
				userSelect: 'none',
				keyboardFocusDim: false,
				focusVisible: focusRing(2),
			}}
		>
			<Show when={props.chipPosition === 'left'}>{chipSlot()}</Show>
			<div
				style={{
					display: 'flex',
					flexDirection: stacked() ? 'column' : 'row',
					flexWrap: stacked() ? 'nowrap' : 'wrap',
					alignItems: stacked() ? 'flex-start' : 'center',
					columnGap: stacked() ? 2 : 4,
					rowGap: stacked() ? 2 : 0,
					flexGrow: 1,
					minWidth: 0,
				}}
			>
				{props.children}
			</div>
			<Show when={props.chipPosition === 'right'}>{chipSlot()}</Show>
			{rightArrowSlot()}
		</div>
	);
}

// ─── AskUserQuestions ─────────────────────────────────────────────────────

export function AskUserQuestions(props: {
	questions: AskUserQuestion[];
	currentIndex?: number;
	defaultCurrentIndex?: number;
	onCurrentIndexChange?: (index: number) => void;
	answers?: Answers;
	defaultAnswers?: Answers;
	onAnswersChange?: (answers: Answers) => void;
	onComplete?: (answers: Answers) => void;
	onSkip?: (questionId: string, currentIndex: number) => void;
	skipLabel?: string;
	/** Focus a `freeText` field on the first question too. Later questions always take focus. */
	autoFocus?: boolean;
	testId?: string;
}) {
	const renderer = useGpuixRequired();

	// ── Controlled / uncontrolled state.
	const [internalIndex, setInternalIndex] = createSignal(
		props.defaultCurrentIndex ?? 0,
	);
	const index = () => props.currentIndex ?? internalIndex();
	const setIndex = (next: number) => {
		if (props.currentIndex === undefined) setInternalIndex(next);
		props.onCurrentIndexChange?.(next);
	};
	const [internalAnswers, setInternalAnswers] = createSignal<Answers>(
		props.defaultAnswers ?? {},
	);
	const answers = () => props.answers ?? internalAnswers();
	// Read through this, not the signal: a write earlier in the same tick must not be missed.
	let latestAnswers = answers();
	createEffect(() => {
		latestAnswers = answers();
	});
	const writeAnswers = (update: (previous: Answers) => Answers) => {
		const next = update(latestAnswers);
		latestAnswers = next;
		if (props.answers === undefined) setInternalAnswers(next);
		props.onAnswersChange?.(next);
		return next;
	};

	const total = () => props.questions.length;
	const safeIndex = () =>
		Math.max(0, Math.min(index(), Math.max(0, total() - 1)));
	const question = (): AskUserQuestion | undefined =>
		props.questions[safeIndex()];
	const qId = () => {
		const current = question();
		return current === undefined ? '' : questionKey(current, safeIndex());
	};
	const currentAnswer = () => answers()[qId()];
	const isMulti = () => question()?.multiSelect === true;
	const isSkippable = () => question()?.skippable !== false;
	const isFreeText = () => question()?.freeText === true;
	const isFreeTextMultiline = () => question()?.freeTextMultiline !== false;
	const allowOther = () => !isFreeText() && question()?.allowOther === true;
	const selectedIds = () => currentAnswer()?.selectedIds ?? [];
	const otherText = () => currentAnswer()?.otherText ?? '';
	const options = () => question()?.options ?? NO_OPTIONS;
	const otherIndex = () => (allowOther() ? options().length : -1);
	const rowCount = () => options().length + (allowOther() ? 1 : 0);

	// ── Focus bookkeeping.
	const [focusedRow, setFocusedRow] = createSignal<number | null>(null);
	const [textFocused, setTextFocused] = createSignal(false);
	const [freeTextError, setFreeTextError] = createSignal<string | null>(null);
	const rowElements = new Map<number, HostElement>();
	let keyboardDriving = false;

	const hover = createFluidHover();

	// ── Answer actions.
	const goNext = (snapshot: Answers) => {
		if (safeIndex() >= total() - 1) props.onComplete?.(snapshot);
		else setIndex(safeIndex() + 1);
	};
	const patch = (
		update: (existing: AskUserAnswer | undefined) => Partial<AskUserAnswer>,
	) =>
		writeAnswers((previous) => ({
			...previous,
			[qId()]: {
				questionId: qId(),
				selectedIds: previous[qId()]?.selectedIds ?? [],
				otherText: previous[qId()]?.otherText,
				skipped: false,
				...update(previous[qId()]),
			},
		}));
	const selectSingle = (optionId: string) => {
		const text = latestAnswers[qId()]?.otherText;
		goNext(
			patch(() => ({ selectedIds: [optionId], otherText: text || undefined })),
		);
	};
	const toggleMulti = (optionId: string) => {
		patch((existing) => {
			const ids = new Set(existing?.selectedIds ?? []);
			if (ids.has(optionId)) ids.delete(optionId);
			else ids.add(optionId);
			return { selectedIds: [...ids] };
		});
	};
	const setOther = (text: string) => {
		setFreeTextError(null);
		patch(() => ({ otherText: text }));
	};
	const submitOther = () => {
		const current = question();
		if (current === undefined) return;
		const text = (latestAnswers[qId()]?.otherText ?? '').trim();
		if (text === '') return;
		if (current.freeText && current.freeTextValidate) {
			const message = current.freeTextValidate(text);
			if (message) {
				setFreeTextError(message);
				return;
			}
		}
		setFreeTextError(null);
		goNext(patch(() => ({ otherText: text })));
	};
	/** Enter on a one-line answer field; Shift+Enter and the chords stay with the editor and the card. */
	const submitOtherOnEnter = (event: KeyEvent) => {
		if (event.key !== 'Enter' || event.shiftKey === true || isChord(event))
			return;
		event.preventDefault();
		submitOther();
	};
	const skip = () => {
		const current = question();
		if (current === undefined) return;
		const snapshot = writeAnswers((previous) => ({
			...previous,
			[qId()]: {
				questionId: qId(),
				selectedIds: previous[qId()]?.selectedIds ?? [],
				otherText: previous[qId()]?.otherText,
				skipped: true,
			},
		}));
		props.onSkip?.(qId(), safeIndex());
		goNext(snapshot);
	};
	const back = () => {
		if (safeIndex() > 0) setIndex(safeIndex() - 1);
	};
	const commitMulti = () => goNext(answers());
	const hasAnswer = () =>
		selectedIds().length > 0 || otherText().trim().length > 0;

	// A new question starts clean; a keyboard-driven flow keeps focus on the rows.
	createEffect(
		on(
			safeIndex,
			() => {
				hover.setActiveIndex(null);
				setFocusedRow(null);
				setFreeTextError(null);
				if (!keyboardDriving) return;
				// The source focuses the first row in the same commit. Here focusing it from this effect leaves focus on nothing (checked in the test renderer), so it waits a few frames.
				const timer = setTimeout(() => focusRow(0), 48);
				onCleanup(() => clearTimeout(timer));
			},
			{ defer: true },
		),
	);

	const focusRow = (target: number) => {
		const element = rowElements.get(target);
		if (element === undefined) return;
		renderer.focusElement?.(element.id);
	};
	let otherElement: HostElement | undefined;
	const focusOther = () => {
		if (otherElement === undefined) return;
		renderer.focusElement?.(otherElement.id);
	};
	const groupHolds = (element: object | null) => {
		if (element === null) return false;
		if (element === otherElement) return true;
		for (const row of rowElements.values()) {
			if (row === element) return true;
		}
		return false;
	};
	/** The highlight is only dropped when focus leaves the group: the blur names where it went. */
	const rowBlurred = (row: number, event: DomEvent) => {
		setFocusedRow((current) => (current === row ? null : current));
		if (!groupHolds(event.relatedTarget)) hover.setActiveIndex(null);
	};
	const moveActive = (next: number) => {
		hover.setActiveIndex(next);
		if (allowOther() && next === otherIndex()) focusOther();
		else focusRow(next);
	};

	// ── Keyboard. One handler on the card: the focused row or field bubbles here.
	const onKeyDown = (event: KeyEvent) => {
		const mod = IS_MAC ? event.metaKey : event.ctrlKey;
		keyboardDriving = true;
		if (event.key === 'Enter' && mod) {
			if (!(isMulti() || isFreeText())) return;
			event.preventDefault();
			if (isFreeText()) {
				if (otherText().trim().length > 0) submitOther();
			} else if (hasAnswer()) commitMulti();
			return;
		}
		if (event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}
		const inText = textFocused();
		const key = event.key;
		if (inText) {
			// Caret movement is the editor's, except up and down off a one-line draft.
			if (isFreeText() || (key !== 'ArrowUp' && key !== 'ArrowDown')) return;
			if (otherText().includes('\n')) return;
		}
		if (!inText && key !== undefined && key >= '1' && key <= '9') {
			const slot = Number.parseInt(key, 10) - 1;
			if (slot < options().length) {
				event.preventDefault();
				const id = optionKey(options()[slot], slot);
				if (isMulti()) toggleMulti(id);
				else selectSingle(id);
			} else if (slot === options().length && allowOther()) {
				event.preventDefault();
				focusOther();
			}
			return;
		}
		const focused = focusedRow();
		if (
			!inText &&
			focused !== null &&
			focused < options().length &&
			(key === ' ' || key === 'Enter')
		) {
			event.preventDefault();
			const id = optionKey(options()[focused], focused);
			if (isMulti()) toggleMulti(id);
			else selectSingle(id);
			return;
		}
		if (key === 'ArrowLeft' || key === 'ArrowRight') {
			event.preventDefault();
			if (key === 'ArrowLeft') back();
			else if (isSkippable() && total() > 1) skip();
			return;
		}
		if (rowCount() === 0) return;
		if (
			key === 'ArrowDown' ||
			key === 'ArrowUp' ||
			key === 'Home' ||
			key === 'End'
		) {
			event.preventDefault();
			let next: number;
			if (key === 'Home') next = 0;
			else if (key === 'End') next = rowCount() - 1;
			else {
				const stepped = moveIndex(
					inText ? otherIndex() : hover.activeIndex(),
					key === 'ArrowDown' ? 1 : -1,
					rowCount(),
				);
				if (stepped === null) return;
				next = stepped;
			}
			moveActive(next);
		}
	};

	// ── Selected-row backgrounds: contiguous selections merge into one block.
	const selectedRows = createMemo(() => {
		const rows: number[] = [];
		options().forEach((option, i) => {
			if (selectedIds().includes(optionKey(option, i))) rows.push(i);
		});
		if (allowOther() && otherText().length > 0) rows.push(otherIndex());
		return rows;
	});
	const runs = createMemo(() => {
		const found: { start: number; end: number }[] = [];
		for (const row of selectedRows()) {
			const last = found[found.length - 1];
			if (last !== undefined && row === last.end + 1) last.end = row;
			else found.push({ start: row, end: row });
		}
		return found;
	});
	const runRect = (run: { start: number; end: number }): ItemRect | null => {
		const rects = hover.rects();
		const first = rects[run.start];
		const last = rects[run.end];
		if (!hover.isMeasured() || first === undefined || last === undefined) {
			return null;
		}
		return {
			top: first.top,
			left: first.left,
			width: first.width,
			height: last.top + last.height - first.top,
		};
	};
	const hoverRect = () => {
		const active = hover.activeIndex();
		if (active === null || !hover.isMeasured()) return null;
		return hover.rects()[active] ?? null;
	};
	const otherRect = () => {
		if (!allowOther() || !hover.isMeasured()) return null;
		return hover.rects()[otherIndex()] ?? null;
	};
	const otherHintShown = () =>
		focusedRow() === otherIndex() && otherText().length === 0;

	// ── Content height: the Q/A region animates to its content's measured height.
	const content = createMeasuredHeight();
	const showBack = () => total() > 1 && safeIndex() > 0;
	const showSkip = () => total() > 1 && isSkippable();
	const showSubmit = () => isMulti() || isFreeText();
	const showFooter = () => showBack() || showSkip() || showSubmit();
	const firstSelectedRow = () =>
		options().findIndex((option, i) =>
			selectedIds().includes(optionKey(option, i)),
		);
	const rovingRow = () => (firstSelectedRow() === -1 ? 0 : firstSelectedRow());

	const continueLabel = () =>
		question()?.nextLabel ??
		(safeIndex() >= total() - 1 ? 'Finish' : 'Continue');

	const rows = () => (
		<div
			role={isMulti() ? 'group' : 'radiogroup'}
			{...hover.containerProps}
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				marginLeft: -12,
				marginRight: -12,
			}}
		>
			{/* The empty Other field shows a quiet "type here" outline. */}
			<Show when={otherRect()}>
				{(rect: () => ItemRect) => (
					<motion.div
						testId={`${props.testId ?? 'ask'}-other-hint`}
						initial={{
							opacity: 0,
							top: untrack(rect).top,
							left: untrack(rect).left,
							width: untrack(rect).width,
							height: untrack(rect).height,
						}}
						animate={{
							opacity: otherHintShown() ? 1 : 0,
							top: rect().top,
							left: rect().left,
							width: rect().width,
							height: rect().height,
						}}
						transition={{ ...tween.fast, duration: 0.08 }}
						style={{
							position: 'absolute',
							borderRadius: shape.bg,
							backgroundColor: color.card,
							outlineWidth: 1,
							outlineStyle: 'solid',
							outlineOffset: -1,
							outlineColor: color.border,
							pointerEvents: 'none',
						}}
					/>
				)}
			</Show>
			{/* Below the selection, so a hovered selected row still reads as selected. */}
			<FluidHighlight
				rect={hoverRect}
				session={hover.session}
				radius={shape.bg}
				background={color.hover}
			/>
			<Index each={runs()}>
				{(run) => (
					<FluidHighlight
						rect={() => runRect(run())}
						session={() => 0}
						radius={shape.bg}
						background={color.active}
						glide={tween.moderate}
						fade={tween.moderateExit}
					/>
				)}
			</Index>
			<For each={options()}>
				{(option, i) => {
					const id = () => optionKey(option, i());
					const selected = () => selectedIds().includes(id());
					const stacked = () => question()?.layout === 'stacked';
					const inlineDescription = () =>
						stacked() ? undefined : option.description;
					return (
						<Row
							index={i()}
							testId={`${props.testId ?? 'ask'}-option-${i()}`}
							registerItem={hover.registerItem}
							rowRef={(rowIndex, element) => rowElements.set(rowIndex, element)}
							role={isMulti() ? 'checkbox' : 'radio'}
							isSelected={selected()}
							tabIndex={i() === rovingRow() ? 0 : -1}
							onClick={() =>
								isMulti() ? toggleMulti(id()) : selectSingle(id())
							}
							onFocus={() => {
								hover.setActiveIndex(i());
								setFocusedRow(i());
							}}
							onBlur={(event: DomEvent) => rowBlurred(i(), event)}
							chipContent={i() + 1}
							chipFilled={selected()}
							isMulti={isMulti()}
							showArrow={!isMulti() && hover.activeIndex() === i()}
							bodyLayout={stacked() ? 'stacked' : 'inline'}
							topAlign={stacked()}
							chipPosition={question()?.chipPosition ?? 'right'}
						>
							<Show
								when={inlineDescription()}
								fallback={
									<>
										<StableLabel
											text={option.title}
											heavy={selected()}
											color={color.foreground}
										/>
										<Show when={option.description}>
											<text
												style={{
													...scale.caption,
													color: color.mutedForeground,
												}}
											>
												{option.description}
											</text>
										</Show>
									</>
								}
							>
								{(description: () => string) => (
									<InlineOptionText
										testId={`${props.testId ?? 'ask'}-option-${i()}-description`}
										title={option.title}
										description={description()}
										heavy={selected()}
									/>
								)}
							</Show>
						</Row>
					);
				}}
			</For>
			<Show when={allowOther()}>
				<Row
					index={otherIndex()}
					testId={`${props.testId ?? 'ask'}-other`}
					registerItem={hover.registerItem}
					rowRef={(rowIndex, element) => rowElements.set(rowIndex, element)}
					role={null}
					isSelected={otherText().length > 0}
					tabIndex={-1}
					onClick={focusOther}
					onFocus={() => {
						hover.setActiveIndex(otherIndex());
						setFocusedRow(otherIndex());
					}}
					onBlur={(event: DomEvent) => rowBlurred(otherIndex(), event)}
					chipContent={otherIndex() + 1}
					chipFilled={otherText().length > 0}
					isMulti={isMulti()}
					showArrow={
						!isMulti() &&
						(focusedRow() === otherIndex() ||
							hover.activeIndex() === otherIndex()) &&
						otherText().trim().length > 0
					}
					onArrowClick={
						!isMulti() && otherText().trim().length > 0
							? submitOther
							: undefined
					}
					bodyLayout="inline"
					topAlign={otherText().includes('\n')}
					chipPosition={question()?.chipPosition ?? 'right'}
				>
					<textarea
						ref={(element) => {
							otherElement = element;
						}}
						testId={`${props.testId ?? 'ask'}-other-input`}
						minRows={1}
						value={otherText()}
						placeholder={
							question()?.otherPlaceholder ?? 'Describe in your own words…'
						}
						aria-label={
							question()?.otherPlaceholder ?? 'Describe in your own words'
						}
						theme={fieldTheme()}
						onChange={(event: DomEvent) => setOther(event.value ?? '')}
						onFocus={() => {
							setTextFocused(true);
							hover.setActiveIndex(otherIndex());
							setFocusedRow(otherIndex());
						}}
						onBlur={(event: DomEvent) => {
							setTextFocused(false);
							rowBlurred(otherIndex(), event);
						}}
						onKeyDown={(event: KeyEvent) => {
							if (!isMulti()) submitOtherOnEnter(event);
						}}
						style={{
							...scale.body,
							flexGrow: 1,
							width: '100%',
							minWidth: 0,
							color: color.foreground,
							backgroundColor: color.transparent,
							keyboardFocusDim: false,
						}}
					/>
				</Row>
			</Show>
		</div>
	);

	const freeTextField = () => {
		const [hovered, setHovered] = createSignal(false);
		const multiline = isFreeTextMultiline();
		return (
			<div
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onClick={focusFreeText}
				style={{
					position: 'relative',
					marginTop: 4,
					marginLeft: -12,
					marginRight: -12,
					paddingTop: 10,
					paddingBottom: 10,
					paddingLeft: 12,
					paddingRight: 12,
					minHeight: multiline ? 76 : 40,
					borderRadius: shape.bg,
					cursor: 'text',
					backgroundColor:
						otherText().length > 0
							? color.active
							: textFocused()
								? color.card
								: hovered()
									? color.hover
									: color.transparent,
					...FREE_TEXT_FADE,
					...(textFocused() && otherText().length === 0
						? {
								outlineWidth: 1,
								outlineStyle: 'solid',
								outlineOffset: -1,
								outlineColor: color.border,
							}
						: {}),
				}}
			>
				<textarea
					ref={(element) => {
						otherElement = element;
					}}
					testId={`${props.testId ?? 'ask'}-free-input`}
					autoFocus={safeIndex() > 0 || props.autoFocus !== false}
					minRows={1}
					value={otherText()}
					placeholder={question()?.freeTextPlaceholder ?? 'Type your answer…'}
					aria-label={question()?.title}
					theme={fieldTheme()}
					onChange={(event: DomEvent) => setOther(event.value ?? '')}
					onFocus={() => setTextFocused(true)}
					onBlur={() => setTextFocused(false)}
					onKeyDown={multiline ? undefined : submitOtherOnEnter}
					style={{
						...scale.body,
						width: '100%',
						color: color.foreground,
						backgroundColor: color.transparent,
						keyboardFocusDim: false,
					}}
				/>
			</div>
		);
	};
	const focusFreeText = () => focusOther();

	return (
		<Show
			when={question()}
			fallback={
				<div style={cardStyle()}>
					<div style={{ padding: 20 }}>
						<text
							style={{
								...scale.body,
								color: color.mutedForeground,
								textWrap: 'pretty',
							}}
						>
							No questions.
						</text>
					</div>
				</div>
			}
		>
			<div
				testId={props.testId}
				tabIndex={0}
				onKeyDown={onKeyDown}
				onMouseDown={() => {
					keyboardDriving = false;
				}}
				style={{ ...cardStyle(), keyboardFocusDim: false }}
			>
				{/* Static header: only the number changes. */}
				<div
					style={{
						paddingLeft: 20,
						paddingRight: 20,
						paddingTop: 16,
						paddingBottom: 8,
					}}
				>
					<text style={{ ...scale.caption, color: color.mutedForeground }}>
						{`Question ${safeIndex() + 1} of ${total()}`}
					</text>
				</div>
				{/* The Q/A region: its height animates to the content's, so the footer rides along. */}
				<motion.div
					initial={false}
					animate={{ height: content.height() ?? 0 }}
					transition={content.height() === undefined ? tween.snap : slowSpring}
					style={{
						display: 'flex',
						flexDirection: 'column',
						overflow: 'hidden',
						// Until the content is measured the region keeps its natural height.
						...(content.height() === undefined ? { height: 'auto' } : {}),
					}}
				>
					<div onLayout={content.onLayout} style={{ flexShrink: 0 }}>
						<div
							style={{
								paddingLeft: 20,
								paddingRight: 20,
								paddingBottom: showFooter() ? 4 : 12,
							}}
						>
							<Show when={qId()} keyed>
								<div
									style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
								>
									<text
										style={{
											...scale.title,
											fontVariationSettings: weight.semibold,
											color: color.foreground,
											textWrap: 'balance',
										}}
									>
										{question()?.title}
									</text>
									<Show when={isFreeText()} fallback={rows()}>
										{freeTextField()}
									</Show>
								</div>
							</Show>
						</div>
					</div>
				</motion.div>
				<Show when={showFooter()}>
					<div
						style={{
							paddingLeft: 20,
							paddingRight: 20,
							paddingTop: 4,
							paddingBottom: 8,
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: 8,
								marginLeft: -12,
								marginRight: -12,
							}}
						>
							<div
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									position: 'relative',
									flexGrow: 1,
									minWidth: 0,
									gap: 8,
								}}
							>
								<AnimatePresence mode="popLayout" initial={false}>
									<Show when={showBack()}>
										<FooterButton>
											<Button
												size="compact"
												variant="ghost"
												leadingIcon="arrow-left"
												testId={`${props.testId ?? 'ask'}-back`}
												onClick={back}
											>
												Back
											</Button>
										</FooterButton>
									</Show>
								</AnimatePresence>
								<Show when={freeTextError()}>
									<motion.div
										initial={{ opacity: 0, y: -2 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ ...tween.fast, opacity: { duration: 0.12 } }}
										style={{ paddingLeft: 12, flexShrink: 1, minWidth: 0 }}
									>
										<text
											style={{
												...scale.caption,
												color: color.destructive,
												textWrap: 'pretty',
											}}
										>
											{freeTextError()}
										</text>
									</motion.div>
								</Show>
							</div>
							<div
								style={{
									position: 'relative',
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									gap: 8,
								}}
							>
								<AnimatePresence mode="popLayout" initial={false}>
									<Show when={showSkip()}>
										<FooterButton>
											<Button
												size="compact"
												variant="ghost"
												trailingIcon="arrow-right"
												testId={`${props.testId ?? 'ask'}-skip`}
												onClick={skip}
											>
												{props.skipLabel ?? 'Skip'}
											</Button>
										</FooterButton>
									</Show>
									<Show when={showSubmit()}>
										<FooterButton>
											<Button
												size="compact"
												testId={`${props.testId ?? 'ask'}-continue`}
												disabled={
													isFreeText()
														? otherText().trim().length === 0
														: !hasAnswer()
												}
												onClick={isFreeText() ? submitOther : commitMulti}
												trailingContent={
													<ShortcutChip>{SHORTCUT_GLYPH}</ShortcutChip>
												}
											>
												{continueLabel()}
											</Button>
										</FooterButton>
									</Show>
								</AnimatePresence>
							</div>
						</div>
					</div>
				</Show>
			</div>
		</Show>
	);
}

/**
 * The inline layout's title and description: one paragraph, so a long
 * description runs on from the title's line as in the source. The title is an
 * inline-grid `StableLabel`, an atom in the run that reserves the semibold
 * width, so selecting it never moves the description.
 */
function InlineOptionText(props: {
	testId: string;
	title: string;
	description: string;
	heavy: boolean;
}) {
	return (
		<text style={{ ...scale.body, minWidth: 0, flexShrink: 1 }}>
			<StableLabel
				text={props.title}
				heavy={props.heavy}
				color={color.foreground}
				fade
			/>{' '}
			<span testId={props.testId} style={{ color: color.mutedForeground }}>
				{props.description}
			</span>
		</text>
	);
}

/** A footer button grows in from 0.85 and shrinks back out; the opacity runs on its own 0.1 s tween. */
function FooterButton(props: { children: JSX.Element }) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.85 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.85 }}
			transition={{ ...tween.fast, opacity: { duration: 0.1 } }}
		>
			{props.children}
		</motion.div>
	);
}

function fieldTheme() {
	return {
		text: color.foreground,
		textMuted: color.mutedForeground,
		textFaint: color.mutedForeground,
		textDim: color.mutedForeground,
		caret: color.foreground,
	};
}

function cardStyle() {
	return {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		width: '100%',
		maxWidth: 520,
		overflow: 'hidden',
		backgroundColor: color.card,
		borderRadius: shape.container,
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: color.border,
	} as const;
}
