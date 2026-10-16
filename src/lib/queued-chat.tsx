import { type Accessor, createSignal, For, onCleanup, Show } from 'solid-js';
import { Button } from '#/components/button';
import {
	DropdownContent,
	DropdownMenu,
	DropdownTrigger,
	MenuItem,
} from '#/components/dropdown';
import {
	type ComposerFile,
	fileFromPath,
	InputMessage,
	type InputMessageSlotContext,
	type QueuedMessage,
} from '#/components/input-message';
import { collapsedStackHeight } from '#/components/queued-stack';
import { Tooltip } from '#/components/tooltip';
import {
	ComposerQueueStack,
	ComposerStage,
	Transcript,
	type Turn,
} from './composer-stage';
import type { IconRef } from './icons';
import { PAUSE_ICON, PLAY_ICON } from './playback-icons';

const MODELS = ['Sonnet 5', 'Sonnet 4.6', 'Sonnet 4.5', 'Haiku 4'] as const;
const STAGE_HEIGHT = 440;
const PLACEHOLDER = 'Send while I’m responding to queue a message…';
const THINK_MS = 4000;
const WORD_MS = 150;

const assets = new URL('../../assets/chat-ai/', import.meta.url).pathname;
const PHOTO = fileFromPath(`${assets}micka.png`);
/** No file on disk: a PDF previews as the document glyph either way. */
const NOTES: ComposerFile = {
	path: `${assets}design-notes.pdf`,
	name: 'design-notes.pdf',
	type: 'application/pdf',
};

/** One timer at a time, which the playback button can freeze and resume with the time it had left. */
function createStepper() {
	const [paused, setPaused] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let callback: (() => void) | undefined;
	let remaining = 0;
	let startedAt = 0;

	const fire = () => {
		timer = undefined;
		const next = callback;
		callback = undefined;
		next?.();
	};
	const schedule = () => {
		startedAt = performance.now();
		timer = setTimeout(fire, remaining);
	};
	onCleanup(() => clearTimeout(timer));

	return {
		paused,
		arm(next: () => void, delay: number) {
			callback = next;
			remaining = delay;
			if (!paused()) schedule();
		},
		clear() {
			clearTimeout(timer);
			timer = undefined;
			callback = undefined;
			remaining = 0;
		},
		pause() {
			if (timer !== undefined) {
				clearTimeout(timer);
				timer = undefined;
				remaining = Math.max(0, remaining - (performance.now() - startedAt));
			}
			setPaused(true);
		},
		resume() {
			setPaused(false);
			if (callback !== undefined && timer === undefined) schedule();
		},
	};
}

type Playback = { label: string; icon: IconRef; onClick: () => void };

/**
 * The docs' queued-messages demo: a streaming reply the play button can pause,
 * the queue stack over the composer, and a Reset that returns to the seeded
 * state (paused mid-reply with three messages queued). `rich` adds the attach
 * menu and the model picker, and real attachments.
 */
export function QueuedChat(props: { testId: string; rich?: boolean }) {
	const stepper = createStepper();
	const [value, setValue] = createSignal('');
	const [composerFiles, setComposerFiles] = createSignal<ComposerFile[]>([]);
	const [queue, setQueue] = createSignal<QueuedMessage[]>([]);
	const [status, setStatus] = createSignal<'idle' | 'streaming'>('idle');
	const [chat, setChat] = createSignal<Turn[]>([]);
	const [model, setModel] = createSignal<(typeof MODELS)[number]>(MODELS[0]);

	const patchAssistant = (patch: Partial<Turn>) =>
		setChat((turns) => {
			const next = [...turns];
			for (let index = next.length - 1; index >= 0; index--) {
				if (next[index].from === 'assistant') {
					next[index] = { ...next[index], ...patch };
					break;
				}
			}
			return next;
		});

	const respond = (text: string, files: ComposerFile[]) => {
		const reply = `Replying to “${text}”. Here's a fuller answer that streams in a word at a time so you can watch the queue release the next message.`;
		const words = reply.split(' ');
		setChat((turns) => [
			...turns,
			{ from: 'user', text, files },
			{ from: 'assistant', text: '', thinking: true },
		]);
		setStatus('streaming');
		const reveal = (index: number) => {
			patchAssistant({
				text: words.slice(0, index + 1).join(' '),
				thinking: false,
			});
			if (index === words.length - 1) {
				setStatus('idle');
				return;
			}
			stepper.arm(() => reveal(index + 1), WORD_MS);
		};
		stepper.arm(() => reveal(0), THINK_MS);
	};

	const seed = () => {
		stepper.pause();
		respond('Help me polish the dashboard design', []);
		setQueue([
			{
				id: `${props.testId}-1`,
				text: 'Match these mockups',
				files: [PHOTO, NOTES],
			},
			{ id: `${props.testId}-2`, text: 'Tighten the spacing', files: [] },
			{
				id: `${props.testId}-3`,
				text: 'Audit the color contrast across the dashboard and suggest accessible token values',
				files: [],
			},
		]);
	};
	seed();

	const reset = () => {
		stepper.clear();
		setValue('');
		setComposerFiles([]);
		setChat([]);
		setQueue([]);
		setStatus('idle');
		seed();
	};

	const stop = () => {
		stepper.clear();
		stepper.resume();
		const last = chat()
			.filter((turn) => turn.from === 'assistant')
			.at(-1);
		if (last !== undefined) {
			patchAssistant(
				last.thinking === true || last.text === ''
					? { text: 'Stopped.', thinking: false }
					: { thinking: false },
			);
		}
		setStatus('idle');
	};

	const edit = (item: QueuedMessage) => {
		setValue(item.text);
		setComposerFiles(item.files);
		setQueue(queue().filter((queued) => queued.id !== item.id));
	};

	const playback = (): Playback | undefined => {
		if (stepper.paused()) {
			return { label: 'Resume', icon: PLAY_ICON, onClick: stepper.resume };
		}
		if (status() === 'streaming') {
			return { label: 'Pause', icon: PAUSE_ICON, onClick: stepper.pause };
		}
		if (chat().length > 0 || queue().length > 0) {
			return { label: 'Reset', icon: 'rotate-ccw', onClick: reset };
		}
		return undefined;
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'flex-end',
					height: 32,
				}}
			>
				<Show when={playback()}>
					{(action: Accessor<Playback>) => (
						<Button
							testId={`${props.testId}-playback`}
							variant="ghost"
							size="compact"
							leadingIcon={action().icon}
							onClick={action().onClick}
						>
							{action().label}
						</Button>
					)}
				</Show>
			</div>
			<ComposerStage
				height={STAGE_HEIGHT}
				transcript={<Transcript turns={chat()} />}
				pin={() => [chat(), queue()]}
				reserve={(composerHeight) =>
					composerHeight +
					8 +
					(queue().length > 0 ? collapsedStackHeight(queue().length) + 8 : 0)
				}
				overlay={(composerHeight) => (
					<ComposerQueueStack
						testId={`${props.testId}-stack`}
						queue={queue()}
						onQueueChange={setQueue}
						onEdit={edit}
						bottom={composerHeight() + 8}
					/>
				)}
			>
				<InputMessage
					testId={props.testId}
					value={value()}
					onValueChange={setValue}
					status={status()}
					queue={queue()}
					onQueueChange={setQueue}
					showQueue={false}
					history={chat()
						.filter((turn) => turn.from === 'user')
						.map((turn) => turn.text)}
					files={props.rich === true ? composerFiles() : undefined}
					onFilesChange={props.rich === true ? setComposerFiles : undefined}
					onSend={(text, files, meta) => {
						if (text !== '') respond(text, files);
						// A queued dispatch carries its own text and files: it must leave the draft being typed alone.
						if (meta?.queuedId === undefined) {
							setValue('');
							setComposerFiles([]);
						}
					}}
					onStop={stop}
					placeholder={PLACEHOLDER}
					leftSlot={
						props.rich === true
							? (context: InputMessageSlotContext) => (
									<DropdownMenu testId={`${props.testId}-attach`}>
										<DropdownTrigger>
											{(trigger) => (
												<Tooltip content="Add" side="top">
													<Button
														testId={`${props.testId}-attach-trigger`}
														variant="ghost"
														size="icon-compact"
														icon="plus"
														aria-label="Attach files"
														{...trigger.attributes}
														onMouseDown={trigger.onMouseDown}
														onClick={trigger.onClick}
													/>
												</Tooltip>
											)}
										</DropdownTrigger>
										<DropdownContent>
											<MenuItem
												testId={`${props.testId}-attach-image`}
												index={0}
												label="Image"
												icon="image"
												onSelect={() =>
													context.openFilePicker('image/png,image/jpeg')
												}
											/>
											<MenuItem
												testId={`${props.testId}-attach-pdf`}
												index={1}
												label="PDF"
												icon="square-library"
												onSelect={() =>
													context.openFilePicker('application/pdf')
												}
											/>
										</DropdownContent>
									</DropdownMenu>
								)
							: undefined
					}
					rightSlot={
						props.rich === true ? (
							<DropdownMenu testId={`${props.testId}-model`}>
								<DropdownTrigger>
									{(trigger) => (
										<Tooltip content="Select model" side="top">
											<Button
												testId={`${props.testId}-model-trigger`}
												variant="ghost"
												size="compact"
												trailingIcon="chevron-down"
												{...trigger.attributes}
												onMouseDown={trigger.onMouseDown}
												onClick={trigger.onClick}
											>
												{model()}
											</Button>
										</Tooltip>
									)}
								</DropdownTrigger>
								<DropdownContent
									align="end"
									checkedIndex={MODELS.indexOf(model())}
								>
									<For each={MODELS}>
										{(name, index) => (
											<MenuItem
												testId={`${props.testId}-model-${index()}`}
												index={index()}
												label={name}
												checked={name === model()}
												onSelect={() => setModel(name)}
											/>
										)}
									</For>
								</DropdownContent>
							</DropdownMenu>
						) : undefined
					}
				/>
			</ComposerStage>
		</div>
	);
}
