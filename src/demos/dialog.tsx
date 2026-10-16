import { createSignal, type JSX } from "solid-js";
import { Button } from "#/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	type DialogSize,
} from "#/components/dialog";
import { Select } from "#/components/select";
import type { DemoModule } from "#/lib/demo";
import { DemoCard, DemoRow } from "#/lib/demo-kit";
import { color, type as scale, setThemeChoice } from "#/lib/theme";

const SIZE_COPY: Record<DialogSize, { label: string; text: string }> = {
	sm: {
		label: "Small",
		text: "400px: a confirmation, 1 field, a short message.",
	},
	lg: {
		label: "Large",
		text: "540px: a short form, or a longer confirmation.",
	},
	xl: {
		label: "Extra large",
		text: "880px: 2 columns, a table, or a sidebar beside a panel.",
	},
};

function SizeDemo(props: { size: DialogSize }) {
	const copy = () => SIZE_COPY[props.size];
	return (
		<Dialog>
			<DialogTrigger>
				<Button
					testId={`size-${props.size}`}
					variant="secondary"
				>
					{copy().label}
				</Button>
			</DialogTrigger>
			<DialogContent size={props.size} testId={`size-${props.size}-popup`}>
				<DialogHeader>
					<DialogTitle>{`${copy().label} dialog`}</DialogTitle>
					<DialogDescription>{copy().text}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose>
						<Button variant="ghost">Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "editor", label: "Editor" },
	{ value: "viewer", label: "Viewer" },
] as const;

/** A dialog that holds a Select and another Dialog, to see what stacks over what. */
function StackingDemo() {
	const [role, setRole] = createSignal<string | null>("editor");
	return (
		<Dialog>
			<DialogTrigger>
				<Button testId="stack-open" variant="secondary">
					Open dialog with a select
				</Button>
			</DialogTrigger>
			<DialogContent size="sm" testId="stack-popup">
				<DialogHeader>
					<DialogTitle>Invite a teammate</DialogTitle>
					<DialogDescription>
						Their role decides what they can change.
					</DialogDescription>
				</DialogHeader>
				<Select
					testId="stack-select"
					variant="bordered"
					items={ROLES}
					value={role()}
					onValueChange={setRole}
					placeholder="Role"
				/>
				<DialogFooter>
					<Dialog>
						<DialogTrigger>
							<Button testId="stack-nested-open" variant="ghost">
								Discard
							</Button>
						</DialogTrigger>
						<DialogContent size="sm" showCloseButton={false} testId="stack-nested-popup">
							<DialogHeader>
								<DialogTitle>Discard the invite?</DialogTitle>
								<DialogDescription>
									Anything you typed will be lost.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose>
									<Button testId="stack-nested-cancel" variant="ghost">
										Keep editing
									</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<DialogClose>
						<Button testId="stack-send">Send</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** modal={false}: no focus trap and no scroll lock, and a press anywhere outside the dialog closes it. */
function NonModalDemo() {
	const [pressed, setPressed] = createSignal(0);
	return (
		<>
			<Dialog modal={false}>
				<DialogTrigger>
					<Button testId="nonmodal-open" variant="secondary">
						Open non-modal
					</Button>
				</DialogTrigger>
				<DialogContent size="sm" testId="nonmodal-popup">
					<DialogHeader>
						<DialogTitle>Non-modal dialog</DialogTitle>
						<DialogDescription>
							Press outside it, or the trigger again, to close it.
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
			<Button
				testId="nonmodal-other"
				variant="ghost"
				onClick={() => setPressed((count) => count + 1)}
			>
				{`Page button: ${pressed()}`}
			</Button>
		</>
	);
}

/** Keeps a trigger at its own width: a column would stretch it. */
function Row(props: { children: JSX.Element }) {
	return (
		<div style={{ display: "flex", flexDirection: "row" }}>{props.children}</div>
	);
}

export const title = "Dialog";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Basic">
				<Row>
				<Dialog>
					<DialogTrigger>
						<Button testId="basic-open" id="basic-open" variant="tertiary">
							Open dialog
						</Button>
					</DialogTrigger>
					<DialogContent testId="basic-popup">
						<DialogHeader>
							<DialogTitle>Create teamspace</DialogTitle>
							<DialogDescription>
								Add a new teamspace to organize your projects and collaborate
								with your team.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose>
								<Button testId="basic-cancel" id="basic-cancel" variant="ghost">
									Cancel
								</Button>
							</DialogClose>
							<Button testId="basic-create">Create</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				<NonModalDemo />
				</Row>
			</DemoCard>
			<DemoCard title="Stacking">
				<Row>
					<StackingDemo />
				</Row>
			</DemoCard>
			<DemoCard title="Sizes">
				<DemoRow label="sm · lg · xl">
					<SizeDemo size="sm" />
					<SizeDemo size="lg" />
					<SizeDemo size="xl" />
				</DemoRow>
			</DemoCard>
			<DemoCard title="Scoped to a container">
				{/* The scoped overlay is absolute against the nearest positioned ancestor, so this region is `position: relative`. */}
				<div
					testId="scoped-region"
					style={{
						position: "relative",
						overflow: "hidden",
						height: 220,
						borderRadius: 12,
						borderWidth: 1,
						borderColor: color.border,
						backgroundColor: color.background,
					}}
				>
					<Dialog scoped modal={false}>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								gap: 10,
								padding: 16,
							}}
						>
							<text style={{ ...scale.body, color: color.mutedForeground }}>
								The overlay is drawn inside this box, not over the window.
							</text>
							<DialogTrigger>
								<Button testId="scoped-open" variant="secondary">
									Open scoped dialog
								</Button>
							</DialogTrigger>
						</div>
						<DialogContent size="sm" compact testId="scoped-popup">
							<DialogHeader>
								<DialogTitle compact>Scoped dialog</DialogTitle>
								<DialogDescription compact>
									Stays inside its region.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose>
									<Button variant="ghost" size="compact">
										Close
									</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</DemoCard>
		</div>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	shot.expectAria("basic-open", {
		role: "Button",
		has_popup: "Dialog",
		expanded: false,
		controls: undefined,
	});
	await shot.click("basic-open");
	shot.expectText("Create teamspace", true);
	// A modal leaves the page out of the accessibility tree; the popup is named by its title and described by its description.
	shot.expectAria("basic-open", {
		hidden: true,
		expanded: true,
		controls: [shot.idOf("basic-popup")],
	});
	const labelledBy = shot.aria("basic-popup").labelled_by;
	if (!Array.isArray(labelledBy) || labelledBy.length !== 1)
		throw new Error("the dialog is named by its title");
	shot.expectAria(String(labelledBy[0]), { role: "Heading", level: 2 });
	const describedBy = shot.aria("basic-popup").described_by;
	if (!Array.isArray(describedBy) || describedBy.length !== 1)
		throw new Error("the dialog is described by its description");
	shot.expectAria("basic-popup", { role: "Dialog" });
	shot.expectAria("basic-cancel", { role: "Button", hidden: undefined });
	// Focus opens on the first tab stop in the popup (Cancel), not on the popup: Enter presses it.
	await shot.press("Enter");
	shot.expectText("Create teamspace", false);
	shot.expectAria("basic-open", {
		has_popup: "Dialog",
		expanded: false,
		hidden: undefined,
	});
	await shot.click("basic-open");
	shot.expectText("Create teamspace", true);
	shot.capture("basic-open");
	await shot.press("Tab");
	shot.capture("focus-first-tab");
	await shot.press("Escape");
	shot.expectText("Create teamspace", false);
	shot.capture("basic-closed");

	// A press inside the dialog keeps it open; a click that presses and releases on the backdrop closes it.
	await shot.click("basic-open");
	const dialog = shot.centerOf("basic-popup");
	await shot.clickAt(dialog.x, dialog.y);
	shot.expectText("Create teamspace", true);
	await shot.clickAt(1100, 740);
	shot.expectText("Create teamspace", false);

	await shot.click("stack-open");
	await shot.click("stack-select");
	await shot.settle(1200);
	shot.capture("select-over-dialog");
	shot.expectText("Viewer", true);
	// Escape closes only the popup: it is the top layer of the dismiss stack.
	await shot.press("Escape");
	shot.expectText("Viewer", false);
	shot.expectText("Invite a teammate", true);
	await shot.click("stack-select");
	// "Viewer" lies below the panel, over the backdrop, and is still the topmost layer.
	const viewer = shot.centerOf("stack-select");
	await shot.clickAt(viewer.x, viewer.y + 118);
	await shot.settle(1200);
	shot.expectText("Invite a teammate", true);
	await shot.click("stack-nested-open");
	shot.expectText("Discard the invite?", true);
	shot.capture("nested");
	await shot.press("Escape");
	shot.expectText("Discard the invite?", false);
	shot.expectText("Invite a teammate", true);
	await shot.press("Escape");
	shot.expectText("Invite a teammate", false);

	// Two Escapes in one go: the second arrives while the nested dialog still fades, and must reach the dialog behind it.
	await shot.click("stack-open");
	await shot.click("stack-nested-open");
	await shot.press("Escape Escape");
	shot.expectText("Discard the invite?", false);
	shot.expectText("Invite a teammate", false);

	// Non-modal: any outside press closes (the scrim takes it, as in the original, so the page button is not pressed), the trigger toggles.
	await shot.click("nonmodal-open");
	shot.expectText("Non-modal dialog", true);
	shot.capture("non-modal");
	await shot.click("nonmodal-other");
	shot.expectText("Non-modal dialog", false);
	shot.expectText("Page button: 0", true);
	await shot.click("nonmodal-open");
	await shot.click("nonmodal-open");
	shot.expectText("Non-modal dialog", false);
	await shot.click("nonmodal-open");
	await shot.clickAt(1100, 600);
	shot.expectText("Non-modal dialog", false);
	await shot.click("nonmodal-open");
	await shot.press("Escape");
	shot.expectText("Non-modal dialog", false);

	await shot.click("size-xl");
	shot.capture("size-xl");
	await shot.press("Escape");

	await shot.click("scoped-open");
	shot.capture("scoped");
	await shot.press("Escape");

	// Both schemes: the scrim, surface-5 and the popup over it.
	setThemeChoice("light");
	await shot.settle(300);
	await shot.click("basic-open");
	shot.capture("basic-open-light");
	await shot.press("Escape");
	await shot.click("stack-open");
	await shot.click("stack-select");
	shot.capture("select-over-dialog-light");
	await shot.press("Escape Escape");
	shot.expectText("Invite a teammate", false);
	shot.expectText("Viewer", false);
	setThemeChoice("dark");
	await shot.settle(300);
};
