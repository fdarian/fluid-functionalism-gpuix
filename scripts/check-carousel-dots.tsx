/**
 * CarouselDots scenarios: only the current dot is marked (`aria-current`), the
 * others carry no state, and picking a dot moves the mark.
 *
 *   bun scripts/check-carousel-dots.tsx
 */
import { createSignal } from "solid-js";
import { CarouselDots } from "../src/components/carousel-dots";
import { createCheck } from "./check-kit";

const [value, setValue] = createSignal(1);

const check = await createCheck(() => (
	<div style={{ padding: 40 }}>
		<CarouselDots
			testId="dots"
			count={3}
			value={value()}
			onValueChange={setValue}
			getLabel={(index: number) => `Show ${index}`}
		/>
	</div>
));

await check.settle();

function report(label: string) {
	for (const index of [0, 1, 2]) {
		const node = check.aria(`Show ${index}`);
		console.log(label, index, JSON.stringify(node));
	}
}

function expectCurrent(label: string, current: number) {
	for (const index of [0, 1, 2]) {
		const node = check.aria(`Show ${index}`);
		check.expect(
			`${label}: dot ${index} aria_current`,
			node?.aria_current,
			index === current ? "True" : undefined,
		);
		check.expect(
			`${label}: dot ${index} has no selected state`,
			node?.selected,
			undefined,
		);
	}
}

report("initial");
expectCurrent("value 1", 1);

setValue(2);
await check.settle();
expectCurrent("value 2", 2);

check.finish();
