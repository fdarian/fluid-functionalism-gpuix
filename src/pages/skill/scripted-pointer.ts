import {
	type HostElement,
	type HostMouseEvent,
	useGpuixRequired,
} from '@ghia/solid';

type HostNode = HostElement['children'][number];

/** Every element under `root`, by id. */
function descendantsOf(root: HostElement) {
	const found = new Map<number, HostElement>();
	const visit = (node: HostNode) => {
		if (node.kind !== 'element') return;
		found.set(node.id, node);
		for (const child of node.children) visit(child);
	};
	for (const child of root.children) visit(child);
	return found;
}

/** The element under `root` whose `testId` prop is `testId`. */
export function findByTestId(root: HostElement, testId: string) {
	for (const element of descendantsOf(root).values()) {
		if (element.props.get('testId') === testId) return element;
	}
	throw new Error(`no element with testId ${testId} under the example`);
}

type HoverEvent = 'onMouseEnter' | 'onMouseLeave' | 'onMouseMove';

/** Handlers the scripted pointer called itself, so a listener can tell them from a visitor's pointer. */
const scripted = new WeakSet<object>();
export const fromVisitor = (event: object) => !scripted.has(event);

/**
 * A pointer that is not the visitor's. gpuix delivers hover from the one
 * window pointer, which a script has no way to move, so this finds the
 * elements under a point with the renderer's hit test and calls the same
 * `onMouseEnter` / `onMouseLeave` / `onMouseMove` handlers a real pointer
 * would reach, and `click()`s the element under it. The root itself is left
 * out: its handlers are the visitor detection.
 */
export function createScriptedPointer(root: () => HostElement | undefined) {
	const renderer = useGpuixRequired();
	/** Under the pointer, deepest first. */
	let chain: HostElement[] = [];

	const fire = (
		element: HostElement,
		type: HoverEvent,
		at: { x: number; y: number },
	) => {
		const handler = element.props.get(type);
		if (typeof handler !== 'function') return;
		const eventType = type.slice('on'.length).toLowerCase();
		const event: HostMouseEvent = {
			elementId: element.id,
			eventType,
			type: eventType,
			x: at.x,
			y: at.y,
			clientX: at.x,
			clientY: at.y,
			target: element,
			currentTarget: element,
			relatedTarget: null,
			composedPath: () => [element],
			eventPhase: 2,
			bubbles: false,
			cancelable: false,
			timeStamp: performance.now(),
			defaultPrevented: false,
			stopPropagation() {},
			stopImmediatePropagation() {},
			preventDefault() {},
			pointerId: 1,
			pointerType: 'mouse',
			movementX: 0,
			movementY: 0,
		};
		scripted.add(event);
		handler(event);
	};

	const under = (at: { x: number; y: number }) => {
		const container = root();
		if (container === undefined) throw new Error('the example has no root');
		if (renderer.getElementsAt === undefined) {
			throw new Error('this renderer has no hit test (getElementsAt)');
		}
		const own = descendantsOf(container);
		const hit: HostElement[] = [];
		for (const id of renderer.getElementsAt(at.x, at.y)) {
			const element = own.get(id);
			if (element !== undefined) hit.push(element);
		}
		return hit;
	};

	return {
		/** Moves to a window point: what left is left, what was entered is entered, and everything under it hears a move. */
		moveTo(at: { x: number; y: number }) {
			const next = under(at);
			for (const element of chain) {
				if (!next.includes(element)) fire(element, 'onMouseLeave', at);
			}
			for (const element of [...next].reverse()) {
				if (!chain.includes(element)) fire(element, 'onMouseEnter', at);
			}
			chain = next;
			for (const element of chain) fire(element, 'onMouseMove', at);
		},
		click() {
			const target = chain[0];
			if (target === undefined)
				throw new Error('the scripted pointer clicked nothing');
			target.click();
		},
		/** Leaves everything it was over. */
		release(at: { x: number; y: number }) {
			for (const element of chain) fire(element, 'onMouseLeave', at);
			chain = [];
		},
	};
}
