import { color } from "#/lib/theme";
import type { ChangeKind } from "./parse";

/**
 * One colour per kind, shared by the changelog's entry dots and the sidebar's:
 * info for New, destructive for Breaking, and for Updated the gray of the
 * timeline's line (`border`, which is translucent: a dot that sits on the line
 * needs an opaque base under it). Read inside JSX props, like `color`.
 */
export function kindDotColor(kind: ChangeKind): string {
	switch (kind) {
		case "new":
			return color.info;
		case "breaking":
			return color.destructive;
		case "updated":
			return color.border;
	}
}
