declare module 'virtual:demos' {
	const entries: { file: string; module: unknown }[];
	export default entries;
}

declare module 'virtual:pages' {
	const entries: { file: string; module: unknown }[];
	export default entries;
}

declare module 'virtual:changelog' {
	const entries: { name: string; text: string }[];
	export default entries;
}
