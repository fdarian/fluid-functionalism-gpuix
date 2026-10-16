import { For } from "solid-js";
import { MONO } from "#/lib/doc-page";
import { color, siteType, weight, withAlpha } from "#/lib/theme";

type Mark = "add" | "remove" | null;

/**
 * Splits a release's diff into marked lines, as the source's `highlightDiff`
 * does: releases write `- code` with a space after the marker, plain unified
 * diffs write `-code`, and the space goes too when every line has one.
 */
function diffLines(diff: string): { mark: Mark; text: string }[] {
	const lines = diff.replace(/\n+$/, "").split("\n");
	const spaced = lines.every((line) => !line || /^[+\- ]( |$)/.test(line));
	return lines.map((line) => ({
		mark: line.startsWith("+") ? "add" : line.startsWith("-") ? "remove" : null,
		text: /^[+\- ]/.test(line) ? line.slice(spaced ? 2 : 1) : line,
	}));
}

/**
 * The Breaking entry's diff: `.changelog-diff` of the source, a bordered
 * rounded box whose `+` and `-` lines tint green or red with the marker in a
 * 28px gutter. There is no syntax highlighting: the code is plain monospace.
 */
export function DiffBlock(props: { diff: string }) {
	return (
		<div
			style={{
				width: "100%",
				overflowX: "auto",
				borderRadius: 8,
				borderWidth: 1,
				borderColor: color.border,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					flexShrink: 0,
					minWidth: "100%",
					paddingTop: 8,
					paddingBottom: 8,
				}}
			>
				<For each={diffLines(props.diff)}>
					{(line) => (
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								paddingLeft: 12,
								paddingRight: 12,
								backgroundColor:
									line.mark === "add"
										? withAlpha(color.success, 0.14)
										: line.mark === "remove"
											? withAlpha(color.destructive, 0.14)
											: color.transparent,
							}}
						>
							<div style={{ width: 16, flexShrink: 0 }}>
								<text
									style={{
										fontFamily: MONO,
										fontSize: siteType.caption.fontSize,
										lineHeight: siteType.caption.lineHeight,
										fontWeight: weight.normal,
										color:
											line.mark === "add"
												? color.success
												: line.mark === "remove"
													? color.destructive
													: color.transparent,
										whiteSpace: "pre",
									}}
								>
									{line.mark === "add"
										? "+"
										: line.mark === "remove"
											? "-"
											: " "}
								</text>
							</div>
							<text
								style={{
									fontFamily: MONO,
									fontSize: siteType.caption.fontSize,
									lineHeight: siteType.caption.lineHeight,
									fontWeight: weight.normal,
									color: color.foreground,
									whiteSpace: "pre",
								}}
							>
								{line.text === "" ? " " : line.text}
							</text>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}
