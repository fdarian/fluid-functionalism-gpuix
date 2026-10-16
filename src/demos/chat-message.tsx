import { createSignal, For } from "solid-js";
import { Button } from "../components/button";
import { ChatMessage, ChatMessageAction } from "../components/chat-message";
import type { FileLike } from "../components/file-thumbnail";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";

interface Message {
	from: "user" | "assistant";
	time?: string;
	text: string;
}

const CONVERSATION: Message[] = [
	{
		from: "user",
		time: "Wednesday 6:06 PM",
		text: 'What does "good design" actually mean? Everyone says it, no one defines it.',
	},
	{
		from: "assistant",
		text: "Good design is mostly invisible — you only notice it when it's missing. It's less about how something looks and more about how effortlessly it lets you do what you came to do.",
	},
	{ from: "user", time: "Wednesday 6:07 PM", text: "So function over form?" },
	{
		from: "assistant",
		text: "Not quite. Form is part of function — something that feels good to use is, in a real sense, working better. The split between the two is mostly a myth.",
	},
	{
		from: "user",
		time: "Wednesday 6:08 PM",
		text: "That reframes it completely.",
	},
];

const FOLLOW_UP: Message = {
	from: "user",
	time: "Wednesday 6:09 PM",
	text: "Say more about that.",
};

const avatar: FileLike = {
	name: "micka.png",
	type: "image/png",
	src: new URL("../../assets/chat-ai/micka.png", import.meta.url).pathname,
};

/** Illustrative only, like the docs page: the buttons carry no behaviour. */
function Actions(props: { from: "user" | "assistant"; testId?: string }) {
	return (
		<>
			<ChatMessageAction
				action="copy"
				label="Copy message"
				testId={props.testId}
			/>
			<ChatMessageAction
				action={props.from === "user" ? "edit" : "regenerate"}
				label={props.from === "user" ? "Edit message" : "Regenerate response"}
			/>
		</>
	);
}

function Transcript(props: { messages: Message[]; testPrefix: string }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				width: "100%",
			}}
		>
			<For each={props.messages}>
				{(message, index) => (
					<ChatMessage
						testId={`${props.testPrefix}-${index()}`}
						from={message.from}
						time={message.time}
						actions={
							<Actions
								from={message.from}
								testId={`${props.testPrefix}-${index()}-copy`}
							/>
						}
					>
						{message.text}
					</ChatMessage>
				)}
			</For>
		</div>
	);
}

export const title = "ChatMessage";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	const [messages, setMessages] = createSignal(CONVERSATION);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Conversation">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Transcript messages={messages()} testPrefix="chat" />
					<div style={{ display: "flex", flexDirection: "row" }}>
						<Button
							testId="add-message"
							variant="secondary"
							size="compact"
							onClick={() => setMessages([...messages(), FOLLOW_UP])}
						>
							Add message
						</Button>
					</div>
				</div>
			</DemoCard>
			<div>
				<DemoCard title="Roles">
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 8,
							width: "100%",
						}}
					>
						<ChatMessage from="user">Right-aligned accent bubble.</ChatMessage>
						<ChatMessage from="assistant">
							Left-aligned, no background.
						</ChatMessage>
					</div>
				</DemoCard>
			</div>
			<div>
				<DemoCard title="Attachments">
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 8,
							width: "100%",
						}}
					>
						<ChatMessage from="user" files={[avatar]}>
							Can you use this as my new avatar?
						</ChatMessage>
						<ChatMessage from="assistant">
							Looks great — it'll crop cleanly into the circle.
						</ChatMessage>
					</div>
				</DemoCard>
			</div>
		</div>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.moveTo(650, 60);
	await shot.moveTo(650, 60);
	await shot.hover("chat-0");
	shot.capture("hover-user");
	await shot.hover("chat-0-copy");
	shot.capture("hover-action");
	await shot.hover("chat-1");
	shot.capture("hover-assistant");
	await shot.moveTo(1180, 700);
	await shot.click("add-message");
	shot.capture("added");
	await shot.scroll(600, 400, 0, 700);
	await shot.settle();
	shot.capture("attachments");
};
