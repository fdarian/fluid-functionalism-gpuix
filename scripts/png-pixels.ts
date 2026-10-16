import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface Pixels {
	width: number;
	height: number;
	at(x: number, y: number): [number, number, number, number];
}

/** Decodes an 8-bit RGB or RGBA, non-interlaced PNG: enough for `captureScreenshot` output. */
export function readPng(path: string): Pixels {
	const file = readFileSync(path);
	let offset = 8;
	let width = 0;
	let height = 0;
	let channels = 0;
	const parts: Buffer[] = [];
	while (offset < file.length) {
		const length = file.readUInt32BE(offset);
		const kind = file.toString('ascii', offset + 4, offset + 8);
		const body = file.subarray(offset + 8, offset + 8 + length);
		if (kind === 'IHDR') {
			width = body.readUInt32BE(0);
			height = body.readUInt32BE(4);
			if (body[8] !== 8 || body[12] !== 0) {
				throw new Error('only 8-bit non-interlaced PNGs are supported');
			}
			if (body[9] === 6) channels = 4;
			else if (body[9] === 2) channels = 3;
			else throw new Error(`unsupported PNG colour type ${body[9]}`);
		}
		if (kind === 'IDAT') parts.push(body);
		offset += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(parts));
	const stride = width * channels;
	const data = Buffer.alloc(stride * height);
	for (let row = 0; row < height; row++) {
		const filter = raw[row * (stride + 1)];
		const source = row * (stride + 1) + 1;
		for (let column = 0; column < stride; column++) {
			const value = raw[source + column] as number;
			const left =
				column >= channels
					? (data[row * stride + column - channels] as number)
					: 0;
			const up = row > 0 ? (data[(row - 1) * stride + column] as number) : 0;
			const upLeft =
				row > 0 && column >= channels
					? (data[(row - 1) * stride + column - channels] as number)
					: 0;
			let predicted = 0;
			if (filter === 1) predicted = left;
			else if (filter === 2) predicted = up;
			else if (filter === 3) predicted = (left + up) >> 1;
			else if (filter === 4) {
				const estimate = left + up - upLeft;
				const toLeft = Math.abs(estimate - left);
				const toUp = Math.abs(estimate - up);
				const toUpLeft = Math.abs(estimate - upLeft);
				predicted =
					toLeft <= toUp && toLeft <= toUpLeft
						? left
						: toUp <= toUpLeft
							? up
							: upLeft;
			}
			data[row * stride + column] = (value + predicted) & 255;
		}
	}
	return {
		width,
		height,
		at(x, y) {
			const index = y * stride + x * channels;
			return [
				data[index] as number,
				data[index + 1] as number,
				data[index + 2] as number,
				channels === 4 ? (data[index + 3] as number) : 255,
			];
		},
	};
}
