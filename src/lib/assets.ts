import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import avatar from '../../assets/chat-ai/avatar.jpg' with { type: 'file' };
import og from '../../assets/chat-ai/og.png' with { type: 'file' };

/**
 * gpuix reads an `<img src>` path with Rust's `std::fs`, which cannot see Bun's
 * embedded filesystem in a compiled binary. Embedded files are copied out once
 * per process; a path that is already on disk (`bun run`) passes through.
 */
export function diskPath(embedded: string): string {
	if (!embedded.startsWith('/$bunfs/')) return embedded;
	const directory = join(tmpdir(), 'fluid-functionalism-assets');
	const target = join(directory, basename(embedded));
	mkdirSync(directory, { recursive: true });
	writeFileSync(target, readFileSync(embedded));
	return target;
}

export const AVATAR_JPG = diskPath(avatar);
export const OG_PNG = diskPath(og);
