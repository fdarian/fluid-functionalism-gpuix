import { type Accessor, createSignal, For, onCleanup, Show } from "solid-js";
import { Button } from "../components/button";
import { ChatMessage } from "../components/chat-message";
import {
	type ComposerFile,
	fileFromPath,
	InputMessage,
	type InputMessageSlotContext,
	type QueuedMessage,
} from "../components/input-message";
import { ThinkingIndicator } from "../components/thinking-indicator";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";

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
	| "basic"
	| "suggestions"
	| "attachments"
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

type Turn = {
	from: "user" | "assistant";
	text: string;
	files?: ComposerFile[];
	thinking?: boolean;
};

function Transcript(props: { turns: Turn[] }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<For each={props.turns}>
				{(turn: Turn) =>
					turn.thinking === true ? (
						<ThinkingIndicator />
					) : (
						<ChatMessage
							from={turn.from}
							files={turn.files?.map((file) => ({
								name: file.name,
								type: file.type,
								src: file.path,
							}))}
						>
							{turn.text}
						</ChatMessage>
					)
				}
			</For>
		</div>
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

function AttachmentsCard() {
	const [value, setValue] = createSignal("");
	const [files, setFiles] = createSignal<ComposerFile[]>([MICKA, RECEIPT]);
	const [turns, setTurns] = createSignal<Turn[]>([]);
	return (
		<DemoCard title="Attachments">
			<div style={{ display: "flex", flexDirection: "column" }}>
				<Show when={turns().length > 0}>
					<div style={{ marginBottom: 12 }}>
						<Transcript turns={turns()} />
					</div>
				</Show>
				<InputMessage
					testId="attachments"
					value={value()}
					onValueChange={setValue}
					files={files()}
					onFilesChange={setFiles}
					onSend={(text, attachments) => {
						if (text === "" && attachments.length === 0) return;
						setTurns([...turns(), { from: "user", text, files: attachments }]);
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
		<DemoCard title="Queued messages">
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
			<Show when={shows("basic")}>
				<BasicCard />
			</Show>
			<Show when={shows("suggestions")}>
				<SuggestionsCard />
			</Show>
			<Show when={shows("attachments")}>
				<AttachmentsCard />
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
