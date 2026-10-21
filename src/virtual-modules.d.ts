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

declare module '*.png' {
	const path: string;
	export default path;
}

declare module '*.jpg' {
	const path: string;
	export default path;
}

declare module '*.ttf' {
	const path: string;
	export default path;
}
