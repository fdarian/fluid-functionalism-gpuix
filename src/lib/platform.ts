export const IS_MAC = process.platform === 'darwin';

/** Hands the URL to the OS's default browser. */
export function openUrl(url: string) {
	Bun.spawn([IS_MAC ? 'open' : 'xdg-open', url]);
}
