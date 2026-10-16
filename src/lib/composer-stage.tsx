import { type HostElement, ResizeObserver } from '@gpuix/solid';
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	Index,
	type JSX,
	onCleanup,
	Show,
} from 'solid-js';
import { ChatMessage } from '#/components/chat-message';
import type { ComposerFile, QueuedMessage } from '#/components/input-message';
import {
	QueuedStack,
	type QueuedMessage as StackMessage,
} from '#/components/queued-stack';
import { ThinkingIndicator } from '#/components/thinking-indicator';

export type Turn = {
	from: 'user' | 'assistant';
	text: string;
	files?: ComposerFile[];
	thinking?: boolean;
};

/** The docs' transcript: user bubbles, assistant text, a thinking indicator for a reply not yet started. Items update in place, so a streaming reply does not replay the entrance per word. */
export function Transcript(props: { turns: Turn[] }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			<Index each={props.turns}>
				{(turn) => (
					<Show
						when={turn().thinking !== true}
						fallback={<ThinkingIndicator />}
					>
						<ChatMessage
							from={turn().from}
							files={turn().files?.map((file) => ({
								name: file.name,
								type: file.type,
								src: file.path,
							}))}
						>
							{turn().text}
						</ChatMessage>
					</Show>
				)}
			</Index>
		</div>
	);
}

/**
 * The docs' floating composer: a transcript that scrolls under the composer,
 * which is pinned to the bottom of a fixed-height stage. The composer's
 * measured height reserves the transcript's bottom padding and positions
 * whatever `overlay` draws above it.
 */
export function ComposerStage(props: {
	height: number;
	transcript: JSX.Element;
	/** Read inside the pin effect: when it changes, the transcript scrolls to its end. */
	pin: () => unknown;
	/** The transcript's bottom padding, from the composer's height. */
	reserve: (composerHeight: number) => number;
	overlay?: (composerHeight: Accessor<number>) => JSX.Element;
	/** The composer. */
	children: JSX.Element;
}) {
	const [composerHeight, setComposerHeight] = createSignal(0);
	const observer = new ResizeObserver((entries) => {
		setComposerHeight(entries[entries.length - 1].borderBoxSize[0].blockSize);
	});
	onCleanup(() => observer.disconnect());

	let scroller: HostElement | undefined;
	createEffect(() => {
		props.pin();
		composerHeight();
		scroller?.scrollTo({ top: scroller.scrollHeight });
	});

	return (
		<div
			style={{
				position: 'relative',
				width: '100%',
				height: props.height,
			}}
		>
			<div
				ref={(element) => {
					scroller = element;
				}}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					overflowY: 'scroll',
					scrollbarWidth: 'none',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						paddingBottom: props.reserve(composerHeight()),
					}}
				>
					{props.transcript}
				</div>
			</div>
			{props.overlay?.(composerHeight)}
			<div
				ref={(element) => observer.observe(element)}
				style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
			>
				{props.children}
			</div>
		</div>
	);
}

/**
 * The queue stack over a composer. The composer takes `ComposerFile`s and the
 * stack `FileLike`s, so this maps between them; the stack only reorders,
 * removes and edits, which the composer's queue can always answer by id.
 */
export function ComposerQueueStack(props: {
	queue: QueuedMessage[];
	onQueueChange: (queue: QueuedMessage[]) => void;
	onEdit: (item: QueuedMessage) => void;
	bottom: number;
	testId?: string;
}) {
	const byId = (id: string) => {
		const found = props.queue.find((item) => item.id === id);
		if (found === undefined) throw new Error(`no queued message ${id}`);
		return found;
	};
	// The stack keys its cards by object identity: a fresh object per read would remount every card and replay its entrance.
	const mapped = new WeakMap<QueuedMessage, StackMessage>();
	const stackItem = (item: QueuedMessage) => {
		const known = mapped.get(item);
		if (known !== undefined) return known;
		const created: StackMessage = {
			id: item.id,
			text: item.text,
			files: item.files.map((file) => ({
				name: file.name,
				type: file.type,
				src: file.path,
			})),
		};
		mapped.set(item, created);
		return created;
	};
	const stackQueue = createMemo(() => props.queue.map(stackItem));
	return (
		<QueuedStack
			testId={props.testId}
			queue={stackQueue()}
			onQueueChange={(next) =>
				props.onQueueChange(next.map((item) => byId(item.id)))
			}
			onEdit={(item) => props.onEdit(byId(item.id))}
			onRemove={(item) =>
				props.onQueueChange(
					props.queue.filter((queued) => queued.id !== item.id),
				)
			}
			bottom={props.bottom}
		/>
	);
}
