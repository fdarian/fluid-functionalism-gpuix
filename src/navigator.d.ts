import type { clipboard } from '@gpuix/solid';

// gpuix installs `navigator.clipboard` at runtime but ships no declaration for it, and Bun's types have none.
declare global {
	interface Navigator {
		readonly clipboard: typeof clipboard;
	}
}
