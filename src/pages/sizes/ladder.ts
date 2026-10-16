import { height, type SizeChoice, type as scale } from "../../lib/theme";

/**
 * The size ladder as the port's components spell it. The port has no
 * `size-context`: each component keeps its own step table, and these are the
 * values they share (`Select` `specs`, `TabsSubtle` `sizes`, `ROW` of the
 * choice groups, `Tabs` `sizes`, `InputGroup` `steps`).
 */
export const LADDER = {
	default: {
		control: height.control,
		segmentItem: 28,
		segmentPad: 4,
		text: scale.body,
		icon: 16,
		px: 12,
		itemPx: 8,
		gap: 8,
	},
	compact: {
		control: height.controlCompact,
		segmentItem: 24,
		segmentPad: 2,
		text: scale.bodyCompact,
		icon: 14,
		px: 10,
		itemPx: 6,
		gap: 4,
	},
} as const satisfies Record<SizeChoice, unknown>;
