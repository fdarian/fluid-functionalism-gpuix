import { createTestRoot } from '@gpuix/solid/testing';

/**
 * A test window at scale factor 1. The test platform opens windows at the scale of the machine's displays, and
 * the checks sample captured pixels at logical coordinates. Set before the first frame; a check of another scale
 * sets it itself afterwards.
 */
export function createTestWindow(
	options: Parameters<typeof createTestRoot>[0],
) {
	const test = createTestRoot(options);
	test.renderer.setWindowScaleFactor(1);
	return test;
}
