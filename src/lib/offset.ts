/** Chrome returns `offset*` as integers, half up; gpuix has no `offset*`, only fractional layout sizes. */
export function toOffsetPx(value: number): number {
	return Math.round(value);
}
