/** gpuix has no way to open a link, so the system command does. Rejects when the command fails. */
export async function openUrl(url: string) {
	const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
	const child = Bun.spawn([command, url]);
	const code = await child.exited;
	if (code !== 0) throw new Error(`${command} exited with ${code}`);
}
