import { createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import { Button } from "../components/button";
import {
	type ComposerFile,
	fileFromPath,
	InputMessage,
	type InputMessageSlotContext,
	type QueuedMessage,
} from "../components/input-message";
import { collapsedStackHeight } from "../components/queued-stack";
import { Tooltip } from "../components/tooltip";
import {
	ComposerQueueStack,
	ComposerStage,
	Transcript,
	type Turn,
} from "../lib/composer-stage";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import {
	PlayDivider,
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySelect,
	PlaySwitch,
	pick,
} from "../lib/playground";
import { QueuedChat } from "../lib/queued-chat";

const SUGGESTIONS = [
	"What is Fluid Functionalism about?",
	"How does Micka tune the springs behind these animations?",
	"Install the InputMessage component in my project",
	"Draft a short thank-you note to Micka for the library",
];

const assets = new URL("../../assets/chat-ai/", import.meta.url).pathname;
const MICKA = fileFromPath(`${assets}micka.png`);
/** No file on disk: a PDF previews as the document glyph either way. */
const RECEIPT: ComposerFile = {
	path: `${assets}Receipt-2581-4039-8265.pdf`,
	name: "Receipt-2581-4039-8265.pdf",
	type: "application/pdf",
};

type Section =
	| "playground"
	| "basic"
	| "suggestions"
	| "attachments"
	| "queued-chat"
	| "queued-rich"
	| "queued"
	| "slots"
	| "send"
	| "disabled";

/** The page is taller than the window; scenarios show one card at a time. */
const [only, setOnly] = createSignal<Section | null>(null);
const shows = (section: Section) => only() === null || only() === section;

/** Streaming replies run until Stop while the screenshot script drives them, so the queue can be photographed. */
let capturing = false;
const STREAM_MS = 3000;

export const title = "Input Message";
export const group = "Components";

type PlayStatus = "off" | "idle" | "streaming";

const PLAY_STATUS_OPTIONS = [
	{ value: "off", label: "Off" },
	{ value: "idle", label: "Idle" },
	{ value: "streaming", label: "Streaming" },
] as const;

const PLAY_ROWS_OPTIONS = [
	{ value: "1", label: "1" },
	{ value: "2", label: "2" },
	{ value: "3", label: "3" },
] as const;

const PLAYGROUND_HEIGHT = 480;

function Playground() {
	const [suggestion, setSuggestion] = createSignal(true);
	const [suggestionsOn, setSuggestionsOn] = createSignal(true);
	const [historyOn, setHistoryOn] = createSignal(true);
	const [minRows, setMinRows] = createSignal("1");
	const [disabled, setDisabled] = createSignal(false);
	const [leftSlotOn, setLeftSlotOn] = createSignal(true);
	const [rightSlotOn, setRightSlotOn] = createSignal(false);
	const [attachments, setAttachments] = createSignal(false);
	const [status, setStatus] = createSignal<PlayStatus>("off");

	const [value, setValue] = createSignal("");
	const [files, setFiles] = createSignal<ComposerFile[]>([]);
	const [queue, setQueue] = createSignal<QueuedMessage[]>([]);
	// One sent message is seeded so the transcript, and ArrowUp's recall, read at a glance.
	const [messages, setMessages] = createSignal<Turn[]>([
		{ from: "user", text: "Make my input box feel less stiff", files: [] },
	]);

	const queueOn = () => status() !== "off";
	const filesOn = () => leftSlotOn() || attachments();
	createEffect(
		on(attachments, (enabled) => setFiles(enabled ? [MICKA, RECEIPT] : [])),
	);

	const edit = (item: QueuedMessage) => {
		setValue(item.text);
		if (filesOn()) setFiles(item.files);
		setQueue(queue().filter((queued) => queued.id !== item.id));
	};

	const shuffle = () => {
		setSuggestion(Math.random() > 0.3);
		setSuggestionsOn(Math.random() > 0.3);
		setHistoryOn(Math.random() > 0.4);
		setMinRows(pick(["1", "1", "2", "3"] as const));
		setDisabled(false);
		setLeftSlotOn(Math.random() > 0.4);
		setRightSlotOn(Math.random() > 0.5);
		setAttachments(Math.random() > 0.7);
		setStatus(pick(["off", "off", "idle", "streaming"] as const));
	};

	return (
		<PlaygroundLayout
			minHeight={PLAYGROUND_HEIGHT}
			preview={
				<ComposerStage
					height={PLAYGROUND_HEIGHT}
					transcript={<Transcript turns={messages()} />}
					pin={() => [messages(), queue()]}
					reserve={(composerHeight) =>
						composerHeight +
						8 +
						(queueOn() && queue().length > 0
							? collapsedStackHeight(queue().length) + 8
							: 0)
					}
					overlay={(composerHeight) => (
						<Show when={queueOn()}>
							<ComposerQueueStack
								testId="play-stack"
								queue={queue()}
								onQueueChange={setQueue}
								onEdit={edit}
								bottom={composerHeight() + 8}
							/>
						</Show>
					)}
				>
					<InputMessage
						testId="play"
						value={value()}
						onValueChange={setValue}
						onSend={(text, sent) => {
							if (text !== "" || sent.length > 0) {
								setMessages([
									...messages(),
									{ from: "user", text, files: sent },
								]);
							}
							setValue("");
							if (filesOn()) setFiles([]);
						}}
						placeholderSuggestion={
							suggestion()
								? "Why is every other input box so stiff?"
								: undefined
						}
						suggestions={suggestionsOn() ? SUGGESTIONS : undefined}
						history={
							historyOn()
								? messages()
										.map((message) => message.text)
										.filter((text) => text !== "")
								: undefined
						}
						minRows={Number(minRows())}
						disabled={disabled()}
						files={filesOn() ? files() : undefined}
						onFilesChange={filesOn() ? setFiles : undefined}
						leftSlot={
							leftSlotOn()
								? (context: InputMessageSlotContext) => (
										<Tooltip content="Attach" side="top">
											<Button
												testId="play-attach"
												variant="ghost"
												size="icon-compact"
												icon="plus"
												aria-label="Attach files"
												onClick={() => context.openFilePicker()}
											/>
										</Tooltip>
									)
								: undefined
						}
						rightSlot={
							rightSlotOn() ? (
								<Button
									variant="ghost"
									size="compact"
									trailingIcon="chevron-down"
								>
									Sonnet 5
								</Button>
							) : undefined
						}
						status={queueOn() ? (status() as "idle" | "streaming") : undefined}
						queue={queueOn() ? queue() : undefined}
						onQueueChange={queueOn() ? setQueue : undefined}
						onStop={queueOn() ? () => setStatus("idle") : undefined}
						showQueue={false}
					/>
				</ComposerStage>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Composer" />
					<PlaySwitch
						testId="play-suggestion"
						label="Placeholder suggestion"
						checked={suggestion()}
						onToggle={() => setSuggestion(!suggestion())}
					/>
					<PlaySwitch
						testId="play-prompts"
						label="Suggested prompts"
						checked={suggestionsOn()}
						onToggle={() => setSuggestionsOn(!suggestionsOn())}
					/>
					<PlaySwitch
						testId="play-history"
						label="History recall"
						checked={historyOn()}
						onToggle={() => setHistoryOn(!historyOn())}
					/>
					<PlaySwitch
						testId="play-attachments"
						label="Attachments"
						checked={attachments()}
						onToggle={() => setAttachments(!attachments())}
					/>
					<PlayField label="Min rows">
						<PlaySelect
							testId="play-rows"
							value={minRows()}
							onChange={setMinRows}
							options={PLAY_ROWS_OPTIONS}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-disabled"
						label="Disabled"
						checked={disabled()}
						onToggle={() => setDisabled(!disabled())}
					/>
					<PlayDivider />
					<PlaySection label="Slots" />
					<PlaySwitch
						testId="play-left"
						label="Left slot"
						checked={leftSlotOn()}
						onToggle={() => setLeftSlotOn(!leftSlotOn())}
					/>
					<PlaySwitch
						testId="play-right"
						label="Right slot"
						checked={rightSlotOn()}
						onToggle={() => setRightSlotOn(!rightSlotOn())}
					/>
					<PlayDivider />
					<PlaySection label="Queue" />
					<PlayField label="Status">
						<PlaySelect
							testId="play-status"
							value={status()}
							onChange={setStatus}
							options={PLAY_STATUS_OPTIONS}
						/>
					</PlayField>
				</PlaygroundPanel>
			}
		/>
	);
}

function BasicCard() {
	const [value, setValue] = createSignal("");
	return (
		<DemoCard title="Basic">
			<InputMessage
				testId="basic"
				value={value()}
				onValueChange={setValue}
				onSend={() => setValue("")}
			/>
		</DemoCard>
	);
}

function SuggestionsCard() {
	const [value, setValue] = createSignal("");
	return (
		<DemoCard title="Suggestions">
			<InputMessage
				testId="suggestions"
				value={value()}
				onValueChange={setValue}
				onSend={() => setValue("")}
				placeholderSuggestion="Why is every other input box so stiff?"
				suggestions={SUGGESTIONS}
			/>
		</DemoCard>
	);
}

const ATTACHMENTS_HEIGHT = 440;
const ATTACHMENTS = [MICKA, RECEIPT];

function AttachmentsCard() {
	const [value, setValue] = createSignal("");
	const [files, setFiles] = createSignal<ComposerFile[]>(ATTACHMENTS);
	const [turns, setTurns] = createSignal<Turn[]>([]);
	const reset = () => {
		setTurns([]);
		setValue("");
		setFiles(ATTACHMENTS);
	};
	return (
		<DemoCard title="Attachments">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "flex-end",
						height: 32,
					}}
				>
					<Show when={turns().length > 0}>
						<Button
							testId="attachments-reset"
							variant="ghost"
							size="compact"
							leadingIcon="rotate-ccw"
							onClick={reset}
						>
							Reset
						</Button>
					</Show>
				</div>
				<ComposerStage
					height={ATTACHMENTS_HEIGHT}
					transcript={<Transcript turns={turns()} />}
					pin={turns}
					reserve={(composerHeight) => composerHeight + 12}
				>
					<InputMessage
						testId="attachments"
						value={value()}
						onValueChange={setValue}
						files={files()}
						onFilesChange={setFiles}
						onSend={(text, attachments) => {
							if (text === "" && attachments.length === 0) return;
							setTurns([
								...turns(),
								{ from: "user", text, files: attachments },
							]);
							setValue("");
							setFiles([]);
						}}
						leftSlot={(context: InputMessageSlotContext) => (
							<Button
								testId="attach"
								variant="ghost"
								size="icon-compact"
								icon="plus"
								onClick={() => context.openFilePicker()}
							/>
						)}
					/>
				</ComposerStage>
			</div>
		</DemoCard>
	);
}

function QueuedCard() {
	const [value, setValue] = createSignal("");
	const [queue, setQueue] = createSignal<QueuedMessage[]>([]);
	const [status, setStatus] = createSignal<"idle" | "streaming">("idle");
	const [turns, setTurns] = createSignal<Turn[]>([]);
	const timers: ReturnType<typeof setTimeout>[] = [];
	onCleanup(() => timers.forEach(clearTimeout));

	/** A stand-in assistant: think for a beat, stream the reply, then go idle and release the queue. */
	const respond = (text: string) => {
		timers.forEach(clearTimeout);
		timers.length = 0;
		setTurns((current) => [
			...current,
			{ from: "user", text },
			{ from: "assistant", text: "", thinking: true },
		]);
		setStatus("streaming");
		const reply =
			`Replying to "${text}". A fuller answer that streams in word by word.`.split(
				" ",
			);
		timers.push(
			setTimeout(
				() => {
					reply.forEach((_, index) => {
						timers.push(
							setTimeout(() => {
								setTurns((current) => [
									...current.slice(0, -1),
									{
										from: "assistant",
										text: reply.slice(0, index + 1).join(" "),
									},
								]);
								if (index === reply.length - 1) setStatus("idle");
							}, index * 120),
						);
					});
				},
				capturing ? 60_000 : STREAM_MS / 3,
			),
		);
	};

	const stop = () => {
		timers.forEach(clearTimeout);
		timers.length = 0;
		setTurns((current) => {
			const last = current[current.length - 1];
			return last?.thinking === true ? current.slice(0, -1) : current;
		});
		setStatus("idle");
	};

	return (
		<DemoCard title="Queued messages, built-in rows">
			<div style={{ display: "flex", flexDirection: "column" }}>
				<Show when={turns().length > 0}>
					<div style={{ marginBottom: 12 }}>
						<Transcript turns={turns().slice(-4)} />
					</div>
				</Show>
				<InputMessage
					testId="queued"
					value={value()}
					onValueChange={setValue}
					status={status()}
					onStop={stop}
					queue={queue()}
					onQueueChange={setQueue}
					onSend={(text) => {
						setValue("");
						respond(text);
					}}
				/>
			</div>
		</DemoCard>
	);
}

function SlotsCard() {
	const [left, setLeft] = createSignal("");
	const [right, setRight] = createSignal("");
	return (
		<DemoCard title="Left and right slots">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<InputMessage
					testId="left-slot"
					value={left()}
					onValueChange={setLeft}
					leftSlot={<Button variant="ghost" size="icon-compact" icon="plus" />}
				/>
				<InputMessage
					testId="right-slot"
					value={right()}
					onValueChange={setRight}
					rightSlot={
						<Button variant="ghost" size="compact" trailingIcon="chevron-down">
							Sonnet 4.6
						</Button>
					}
				/>
			</div>
		</DemoCard>
	);
}

function SendCard() {
	const [value, setValue] = createSignal("");
	const [turns, setTurns] = createSignal<Turn[]>([]);
	const sent = () =>
		turns()
			.filter((turn) => turn.from === "user")
			.map((turn) => turn.text);
	return (
		<DemoCard title="Send handler, with history">
			<div style={{ display: "flex", flexDirection: "column" }}>
				<Show when={turns().length > 0}>
					<div style={{ marginBottom: 12 }}>
						<Transcript turns={turns()} />
					</div>
				</Show>
				<InputMessage
					testId="send"
					value={value()}
					onValueChange={setValue}
					history={sent()}
					onSend={(text) => {
						if (text !== "") setTurns([...turns(), { from: "user", text }]);
						setValue("");
					}}
					placeholder="Press Enter to send. Shift+Enter for newline."
				/>
			</div>
		</DemoCard>
	);
}

function DisabledCard() {
	const [compact, setCompact] = createSignal("");
	return (
		<DemoCard title="Disabled and compact">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<InputMessage
					testId="disabled"
					value=""
					onValueChange={() => {}}
					disabled
				/>
				<InputMessage
					testId="compact"
					size="compact"
					value={compact()}
					onValueChange={setCompact}
				/>
			</div>
		</DemoCard>
	);
}

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<Show when={shows("playground")}>
				<Playground />
			</Show>
			<Show when={shows("basic")}>
				<BasicCard />
			</Show>
			<Show when={shows("suggestions")}>
				<SuggestionsCard />
			</Show>
			<Show when={shows("attachments")}>
				<AttachmentsCard />
			</Show>
			<Show when={shows("queued-chat")}>
				<DemoCard title="Queued messages">
					<QueuedChat testId="chat" />
				</DemoCard>
			</Show>
			<Show when={shows("queued-rich")}>
				<DemoCard title="Queued messages, rich">
					<QueuedChat testId="rich" rich />
				</DemoCard>
			</Show>
			<Show when={shows("queued")}>
				<QueuedCard />
			</Show>
			<Show when={shows("slots")}>
				<SlotsCard />
			</Show>
			<Show when={shows("send")}>
				<SendCard />
			</Show>
			<Show when={shows("disabled")}>
				<DisabledCard />
			</Show>
		</div>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	capturing = true;

	// The playground's controls sit in the right column.
	setOnly("playground");
	await shot.settle(900);
	shot.capture("playground");
	await shot.click("play-attachments-track");
	await shot.click("play-right-track");
	shot.capture("playground-attachments-right");
	await shot.focus("play-status-trigger");
	await shot.press("down down down enter");
	await shot.settle(300);
	await shot.click("play-textarea");
	await shot.press("f i r s t");
	await shot.press("enter");
	await shot.press("s e c o n d");
	await shot.press("enter");
	await shot.press("t h i r d");
	await shot.press("enter");
	await shot.settle(600);
	shot.capture("playground-queued");
	await shot.moveTo(1180, 700);
	await shot.click("playground-shuffle");
	await shot.settle(600);
	shot.capture("playground-shuffled");

	setOnly("basic");
	await shot.settle(500);
	shot.capture("basic");
	await shot.moveTo(...centre(shot, "basic"));
	await shot.click("basic-textarea");
	await shot.press("h e l l o");
	shot.capture("focused");

	setOnly("suggestions");
	await shot.settle(900);
	shot.capture("suggestions");
	await shot.click("suggestions-textarea");
	// The pointer on a prompt's text, not its middle.
	const prompt = shot.centerOf("suggestions-suggestion-2");
	await shot.moveTo(prompt.x - 200, prompt.y);
	await shot.moveTo(prompt.x - 196, prompt.y);
	await shot.moveTo(prompt.x - 192, prompt.y);
	shot.capture("suggestion-hover");
	await shot.moveTo(1180, 700);
	await shot.press("ctrl-n ctrl-n");
	shot.capture("suggestion-keyboard");
	await shot.press("enter");
	shot.capture("suggestion-filled");
	await shot.press("cmd-a backspace");
	await shot.press("tab");
	shot.capture("tab-filled");

	setOnly("attachments");
	await shot.settle(900);
	shot.capture("attachments");
	await shot.hover("attachments-file-0");
	shot.capture("tile-hover");
	await shot.moveTo(1180, 700);
	await shot.click("attachments-file-1-remove");
	shot.capture("file-removed");
	// The transcript scrolls under the composer and stays pinned to its end.
	await shot.click("attachments-textarea");
	for (const word of ["one", "two", "three", "four", "five", "six", "seven"]) {
		await shot.press(word.split("").join(" "));
		await shot.press("enter");
	}
	await shot.settle(600);
	shot.capture("attachments-scrolled");
	await shot.moveTo(1180, 700);
	await shot.click("attachments-reset");
	await shot.settle(600);
	shot.capture("attachments-reset");

	setOnly("queued-chat");
	await shot.settle(900);
	shot.capture("queued-chat");
	await shot.hover("queued-chat-1");
	shot.capture("queued-chat-expanded");
	await shot.moveTo(1180, 700);
	// Resume: think, then the reply streams a word at a time.
	await shot.click("chat-playback");
	await shot.settle(5200);
	shot.capture("queued-chat-streaming");
	await shot.click("chat-playback");
	shot.capture("queued-chat-paused");
	await shot.click("chat-playback");
	// The reply ends and the head of the queue is sent into the transcript.
	await shot.settle(4000);
	shot.capture("queued-chat-dispatched");
	await shot.click("chat-send");
	await shot.settle(600);
	shot.capture("queued-chat-stopped");
	// Each Stop releases the next queued message; once the queue and the reply are done the button becomes Reset.
	await shot.click("chat-send");
	await shot.click("chat-send");
	await shot.click("chat-send");
	await shot.settle(600);
	shot.capture("queued-chat-idle");
	await shot.click("chat-playback");
	await shot.settle(600);
	shot.capture("queued-chat-reset");

	setOnly("queued-rich");
	await shot.settle(900);
	shot.capture("queued-rich");
	// A pointer press that opens a popup cannot run in the test renderer: open the menus from the keyboard.
	await shot.focus("rich-model-trigger");
	await shot.press("enter");
	await shot.settle(300);
	shot.capture("queued-rich-model-menu");
	await shot.press("down enter");
	await shot.settle(300);
	shot.expectText("Sonnet 4.6", true);
	await shot.focus("rich-attach-trigger");
	await shot.press("enter");
	await shot.settle(300);
	shot.capture("queued-rich-attach-menu");
	await shot.press("escape");

	setOnly("queued");
	await shot.settle(500);
	await shot.click("queued-textarea");
	await shot.press("f i r s t");
	await shot.press("enter");
	await shot.press("s e c o n d");
	shot.capture("queue-button");
	await shot.press("enter");
	await shot.press("t h i r d");
	await shot.press("enter");
	await shot.settle(600);
	shot.capture("queued");
	// Drag the first row down past the last one and out of the list: the move and the release still reach the row.
	const last = shot.centerOf("queued-queued-1");
	await shot.down("queued-queued-0");
	await shot.moveHeld(last.x, last.y);
	await shot.moveHeld(last.x + 300, last.y + 400);
	shot.capture("queued-dragged");
	await shot.up("queued-queued-0");
	const row = shot.centerOf("queued-queued-0");
	await shot.moveTo(row.x - 240, row.y);
	await shot.moveTo(row.x - 236, row.y);
	shot.capture("queued-hover-label");
	await shot.hover("queued-queued-0");
	shot.capture("queued-hover");
	await shot.moveTo(1180, 700);
	await shot.click("queued-queued-1-remove");
	shot.capture("queued-removed");
	// Stop releases the head of the queue.
	await shot.click("queued-send");
	await shot.settle(600);
	shot.capture("stopped");

	setOnly("slots");
	await shot.settle(500);
	shot.capture("slots");

	setOnly("send");
	await shot.settle(500);
	await shot.click("send-textarea");
	await shot.press("o n e");
	await shot.press("enter");
	await shot.press("t w o");
	await shot.press("enter");
	await shot.press("ctrl-p");
	shot.capture("history");
	await shot.press("ctrl-p");
	shot.capture("history-back");

	setOnly("disabled");
	await shot.settle(500);
	shot.capture("disabled");

	setOnly(null);
	await shot.settle(400);
};

function centre(
	shot: Parameters<NonNullable<DemoModule["scenarios"]>>[0],
	id: string,
) {
	const point = shot.centerOf(id);
	return [point.x, point.y] as const;
}
