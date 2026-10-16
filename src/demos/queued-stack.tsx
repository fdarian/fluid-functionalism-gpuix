import { createSignal } from "solid-js";
import { Button } from "../components/button";
import type { FileLike } from "../components/file-thumbnail";
import { type QueuedMessage, QueuedStack } from "../components/queued-stack";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { QueuedChat } from "../lib/queued-chat";
import { color, radius, type as scale, shadow3 } from "../lib/theme";

const asset = (name: string) =>
	new URL(`../../assets/chat-ai/${name}`, import.meta.url).pathname;

const photo: FileLike = {
	name: "micka.png",
	type: "image/png",
	src: asset("micka.png"),
};
const screenshot: FileLike = {
	name: "og.png",
	type: "image/png",
	src: asset("og.png"),
};
const notes: FileLike = { name: "design-notes.pdf", type: "application/pdf" };

const SAMPLE_TEXTS = [
	"Can you also add dark mode support?",
	"Fix the flaky test in checkout.spec.ts",
	"Then summarise the changes in a PR description",
	"Which of these should land first?",
	"Add a changelog entry for the new hover",
];

const COMPOSER_H = 76;
const STAGE_H = 330;
const PLACEHOLDER = "Send while I’m responding to queue a message…";

export const title = "Queued Stack";
export const group = "Components";

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<QueuedStackCard />
			<DemoCard title="Queued chat">
				<QueuedChat testId="chat" />
			</DemoCard>
		</div>
	);
}

function QueuedStackCard() {
	let nextId = 5;
	const [queue, setQueue] = createSignal<QueuedMessage[]>([
		{ id: "1", text: SAMPLE_TEXTS[0], files: [] },
		{ id: "2", text: SAMPLE_TEXTS[1], files: [] },
		{
			id: "3",
			text: "Use these as references",
			files: [photo, screenshot, notes],
		},
		{ id: "4", text: SAMPLE_TEXTS[2], files: [] },
	]);
	const [composer, setComposer] = createSignal("");
	const enqueue = (files: FileLike[]) => {
		const id = String(nextId++);
		const text =
			files.length > 0 ? "" : SAMPLE_TEXTS[(nextId - 1) % SAMPLE_TEXTS.length];
		setQueue([...queue(), { id, text, files }]);
	};
	return (
		<DemoCard title="Queued Stack">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
					<Button
						testId="enqueue"
						variant="secondary"
						size="compact"
						onClick={() => enqueue([])}
					>
						Queue message
					</Button>
					<Button
						testId="enqueue-files"
						variant="secondary"
						size="compact"
						onClick={() => enqueue([photo])}
					>
						Queue with attachment
					</Button>
					<Button
						testId="clear"
						variant="ghost"
						size="compact"
						onClick={() => setQueue([])}
					>
						Clear
					</Button>
				</div>
				<div
					style={{
						position: "relative",
						height: STAGE_H,
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
					}}
				>
					{/* The composer is a stand-in: the stack only needs something to sit above. */}
					<div
						style={{
							height: COMPOSER_H,
							padding: 14,
							borderRadius: radius.container,
							backgroundColor: color.card,
							borderWidth: 1,
							borderColor: color.popupBorder,
							boxShadow: shadow3(),
						}}
					>
						<text
							style={{
								...scale.body,
								color:
									composer() === "" ? color.mutedForeground : color.foreground,
							}}
						>
							{composer() === "" ? PLACEHOLDER : composer()}
						</text>
					</div>
					<QueuedStack
						testId="stack"
						queue={queue()}
						onQueueChange={setQueue}
						onEdit={(item) => {
							setComposer(item.text);
							setQueue(queue().filter((entry) => entry.id !== item.id));
						}}
						onRemove={(item) =>
							setQueue(queue().filter((entry) => entry.id !== item.id))
						}
						bottom={COMPOSER_H + 8}
					/>
				</div>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.moveTo(1180, 700);
	shot.capture("collapsed");
	// Over the front card: the stack fans out and the card shows its actions.
	await shot.hover("queued-1");
	shot.capture("expanded");
	await shot.hover("edit-1");
	shot.capture("action-hover");

	// Drag the second card to the top slot; the others close up around it.
	await shot.hover("queued-1");
	const top = shot.centerOf("queued-4");
	await shot.down("queued-2");
	const grab = shot.centerOf("queued-2");
	await shot.moveHeld(grab.x, grab.y - 40);
	await shot.moveHeld(grab.x, (grab.y + top.y) / 2);
	shot.capture("drag-middle");
	await shot.moveHeld(grab.x, top.y);
	shot.capture("drag-top");
	await shot.up("queued-2");
	shot.capture("dragged");

	await shot.moveTo(1180, 700);
	await shot.click("enqueue");
	shot.capture("enqueued");
	await shot.hover("queued-1");
	await shot.click("remove-1");
	shot.capture("removed");
	// The pencil takes the card back into the composer.
	await shot.hover("queued-3");
	await shot.click("edit-3");
	shot.capture("edited");
	await shot.moveTo(1180, 700);
	await shot.click("clear");
	shot.capture("cleared");

	// The queued chat sits below the fold.
	await shot.scroll(600, 400, 0, -700);
	await shot.settle(300);
	shot.capture("queued-chat");
	await shot.hover("queued-chat-1");
	shot.capture("queued-chat-expanded");
	await shot.moveTo(1180, 700);
	await shot.click("chat-playback");
	await shot.settle(6000);
	shot.capture("queued-chat-streaming");
};
