import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { Button } from "../components/button";
import { ChatMessage } from "../components/chat-message";
import type { FileLike } from "../components/file-thumbnail";
import {
	type ComposerFile,
	InputMessage,
	type InputMessageSlotContext,
	type QueuedMessage,
} from "../components/input-message";
import { ScrollArea } from "../components/scroll-area";
import { ThinkingIndicator } from "../components/thinking-indicator";
import type { ShotContext } from "../lib/demo";
import { color } from "../lib/theme";
import { ConceptFrame } from "./concepts/frame";

export const title = "Atlas";
export const group = "Pages";
export const order = 32;
export const layout = "full";
export const listed = "none";

/** `max-w-[720px]` on the transcript and the composer. */
const CHAT_WIDTH = 720;
/** ChatMessage's own body style (`text-[14px] leading-5`): a string child gets it, a node child does not. */
const MESSAGE_TYPE = { fontSize: 14, lineHeight: 20 } as const;
/** How long the assistant is "responding" before its reply lands. */
const REPLY_MS = 1800;
/** The screenshot script takes seconds, not 1.8, to type a second message and scroll before the reply lands. */
const CAPTURE_REPLY_MS = 5000;
let replyMs = REPLY_MS;
/** The ThinkingIndicator's own horizontal padding, which the source cancels with `!px-0`. */
const INDICATOR_PAD = 12;

export async function scenarios(shot: ShotContext) {
	replyMs = CAPTURE_REPLY_MS;
	await shot.click("input-message-textarea");
	await shot.press("w r i t e Space t h e Space t i c k e t s");
	await shot.press("Enter");
	// A second message while the first is still answering is queued under the composer.
	await shot.press("a n d Space s m a l l e r");
	await shot.press("Enter");
	// The page does not follow a new message (ScrollArea has no scroll-to-end), so scroll to it.
	await shot.scroll(580, 300, 0, 3000);
	shot.expectText("write the tickets", true);
	shot.expectText("Here's a first cut", false);
	shot.expectText("and smaller", true);
	shot.capture("streaming");
	await shot.moveTo(600, 300);
	await shot.settle(CAPTURE_REPLY_MS);
	await shot.scroll(580, 300, 0, 3000);
	shot.expectText("Here's a first cut", true);
	shot.capture("replied");
}

// ── Fixtures ────────────────────────────────────────────────────────────

interface Msg {
	id: string;
	from: "user" | "assistant";
	text: string;
	files?: FileLike[];
}

const SEED: Msg[] = [
	{
		id: "u1",
		from: "user",
		text: "Can you turn this architecture sketch into a short build plan?",
	},
	{
		id: "a1",
		from: "assistant",
		text: "Of course. Your sketch shows three layers — an edge gateway, a stateless API tier, and a managed Postgres. A pragmatic build order:\n\n1. Stand up Postgres + migrations first; it's the slowest to change.\n2. Build the API tier against it with health checks before any auth.\n3. Put the gateway last so you're not debugging routing and business logic at once.\n\nWant me to expand any layer into tickets?",
	},
	{
		id: "u2",
		from: "user",
		text: "Yes — break the API tier into tickets, smallest shippable first.",
	},
];

/** The attachment on the opening message: an SVG drawn here and written to a temp file, since gpuix reads images from paths. */
function makeDemoFile(): FileLike {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="#0f172a"/><g fill="none" stroke="#38bdf8" stroke-width="2"><rect x="40" y="30" width="240" height="40" rx="6"/><rect x="40" y="100" width="240" height="40" rx="6"/><rect x="40" y="170" width="240" height="30" rx="6"/></g><g fill="#e2e8f0" font-family="sans-serif" font-size="14"><text x="56" y="55">Edge gateway</text><text x="56" y="125">API tier</text><text x="56" y="190">Postgres</text></g></svg>`;
	const path = join(mkdtempSync(join(tmpdir(), "atlas-")), "architecture.svg");
	writeFileSync(path, svg);
	return { name: "architecture.svg", type: "image/svg+xml", src: path };
}

const asFileLike = (file: ComposerFile): FileLike => ({
	name: file.name,
	type: file.type,
	src: file.path,
});

/** `whitespace-pre-wrap`: the port's ChatMessage sets a string as one collapsing run, so each line is its own block and a blank line keeps its height. */
function Lines(props: { text: string }) {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<For each={props.text.split("\n")}>
				{(line) => (
					<Show when={line !== ""} fallback={<div style={{ height: 20 }} />}>
						<text style={{ ...MESSAGE_TYPE, color: color.foreground }}>
							{line}
						</text>
					</Show>
				)}
			</For>
		</div>
	);
}

function AssistantActions() {
	return (
		<>
			<Button
				variant="ghost"
				size="icon-compact"
				icon="copy"
				aria-label="Copy"
				testId="atlas-copy"
			/>
			<Button
				variant="ghost"
				size="icon-compact"
				icon="rotate-ccw"
				aria-label="Regenerate"
				testId="atlas-regenerate"
			/>
		</>
	);
}

// ── Page ────────────────────────────────────────────────────────────────

export function Page() {
	const demoFile = makeDemoFile();
	const [messages, setMessages] = createSignal<Msg[]>(
		SEED.map((message) =>
			message.id === "u1" ? { ...message, files: [demoFile] } : message,
		),
	);
	const [draft, setDraft] = createSignal("");
	const [files, setFiles] = createSignal<ComposerFile[]>([]);
	const [responding, setResponding] = createSignal(false);
	const [status, setStatus] = createSignal<"idle" | "streaming">("idle");
	const [queue, setQueue] = createSignal<QueuedMessage[]>([]);
	let counter = 0;
	let replyTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(replyTimer));

	const reply = (userText: string) => {
		setResponding(true);
		setStatus("streaming");
		replyTimer = setTimeout(() => {
			const clipped =
				userText.length > 40 ? `${userText.slice(0, 40)}…` : userText;
			setMessages((current) => [
				...current,
				{
					id: `a${counter++}`,
					from: "assistant",
					text: `Here's a first cut for "${clipped}":\n\n• Ticket 1 — define the request/response contract\n• Ticket 2 — health + readiness endpoints\n• Ticket 3 — the first real handler, no auth yet\n\nEach is independently shippable. Want estimates?`,
				},
			]);
			setResponding(false);
			setStatus("idle");
		}, replyMs);
	};

	const send = (value: string, sent: ComposerFile[]) => {
		const text = value.trim();
		if (text === "" && sent.length === 0) return;
		setMessages((current) => [
			...current,
			{
				id: `u${counter++}`,
				from: "user",
				text,
				files: sent.length > 0 ? sent.map(asFileLike) : undefined,
			},
		]);
		setDraft("");
		setFiles([]);
		reply(text === "" ? "the attached file" : text);
	};

	const stop = () => {
		clearTimeout(replyTimer);
		setResponding(false);
		setStatus("idle");
	};

	return (
		<ConceptFrame>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
				}}
			>
				<div style={{ flexGrow: 1, minHeight: 0 }}>
					<ScrollArea height="100%">
						<div
							style={{
								width: "100%",
								maxWidth: CHAT_WIDTH,
								alignSelf: "center",
								display: "flex",
								flexDirection: "column",
								gap: 20,
								paddingLeft: 24,
								paddingRight: 24,
								paddingTop: 48,
								paddingBottom: 48,
							}}
						>
							<For each={messages()}>
								{(message) => (
									<ChatMessage
										from={message.from}
										files={message.files}
										time={message.from === "user" ? "Just now" : undefined}
										actions={
											message.from === "assistant" ? (
												<AssistantActions />
											) : undefined
										}
									>
										<Lines text={message.text} />
									</ChatMessage>
								)}
							</For>
							<Show when={responding()}>
								<ChatMessage from="assistant" fullWidth>
									<div style={{ marginLeft: -INDICATOR_PAD }}>
										<ThinkingIndicator testId="atlas-thinking" />
									</div>
								</ChatMessage>
							</Show>
						</div>
					</ScrollArea>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						paddingLeft: 24,
						paddingRight: 24,
						paddingTop: 4,
						paddingBottom: 20,
					}}
				>
					<div style={{ width: "100%", maxWidth: CHAT_WIDTH }}>
						<InputMessage
							value={draft()}
							onValueChange={setDraft}
							onSend={send}
							placeholder="Message Atlas…"
							files={files()}
							onFilesChange={setFiles}
							status={status()}
							onStop={stop}
							queue={queue()}
							onQueueChange={setQueue}
							minRows={1}
							maxRows={6}
							leftSlot={(context: InputMessageSlotContext) => (
								<Button
									variant="ghost"
									size="icon-compact"
									icon="image"
									aria-label="Attach file"
									testId="atlas-attach"
									onClick={() => context.openFilePicker()}
								/>
							)}
						/>
						<div
							style={{
								marginTop: 8,
								display: "flex",
								justifyContent: "center",
							}}
						>
							<text
								style={{
									fontSize: 11,
									lineHeight: 14,
									color: color.mutedForeground,
									textAlign: "center",
								}}
							>
								Atlas can make mistakes. This is a concept screen.
							</text>
						</div>
					</div>
				</div>
			</div>
		</ConceptFrame>
	);
}
