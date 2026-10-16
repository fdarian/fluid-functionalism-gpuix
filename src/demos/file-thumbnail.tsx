import { For } from "solid-js";
import { type FileLike, FileThumbnail } from "../components/file-thumbnail";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";

const photo: FileLike = {
	name: "micka.png",
	type: "image/png",
	src: new URL("../../assets/chat-ai/micka.png", import.meta.url).pathname,
};
const pdf: FileLike = { name: "design-notes.pdf", type: "application/pdf" };
const SIZES = [28, 48, 64, 96];

export const title = "FileThumbnail";
export const group = "Components";
export const listed = "menu";

export function Demo() {
	return (
		<DemoCard title="File Thumbnail">
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<DemoRow label="Image">
					<For each={SIZES}>
						{(size) => <FileThumbnail file={photo} size={size} />}
					</For>
				</DemoRow>
				<DemoRow label="No preview">
					<For each={SIZES}>
						{(size) => <FileThumbnail file={pdf} size={size} />}
					</For>
				</DemoRow>
				<DemoRow label="Pending">
					<FileThumbnail file={pdf} size={64} pending />
					<FileThumbnail file={photo} size={64} pending />
				</DemoRow>
				<DemoRow label="Radius">
					<FileThumbnail file={photo} size={64} radius={4} />
					<FileThumbnail file={photo} size={64} radius={16} />
					<FileThumbnail file={photo} size={64} radius={32} />
				</DemoRow>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The spinner arc turns on a timer: two frames show it moved.
	await shot.settle(250);
	shot.capture("pending-a");
	await shot.settle(310);
	shot.capture("pending-b");
};
