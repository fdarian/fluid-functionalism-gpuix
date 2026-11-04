#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pkg from '../package.json' with { type: 'json' };

const NAME = 'ghia-fluid-functionalism';
const TARGET = 'darwin-arm64';
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
}

function releaseUrl() {
	return `https://github.com/fdarian/ghia-fluid-functionalism/releases/download/${NAME}%40${pkg.version}/${NAME}-${TARGET}.tar.gz`;
}

async function readExpectedChecksum() {
	const checksumsUrl = new URL('./checksums.json', import.meta.url);
	let raw: string;
	try {
		raw = await readFile(checksumsUrl, 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(
				`${NAME} is missing ${checksumsUrl.pathname}: the package was published without release checksums`,
			);
		}
		throw error;
	}
	const checksums = JSON.parse(raw) as Record<string, string | undefined>;
	const checksum = checksums[TARGET];
	if (checksum === undefined) {
		throw new Error(`${checksumsUrl.pathname} has no entry for ${TARGET}`);
	}
	return checksum;
}

async function downloadTo(url: string, file: string) {
	const response = await fetch(url);
	if (response.status === 404) {
		throw new Error(
			`${url} returned 404. The release assets may still be uploading: retry in a few minutes.`,
		);
	}
	if (!response.ok || response.body === null) {
		throw new Error(`${url} failed: HTTP ${response.status}`);
	}
	const hash = createHash('sha256');
	const body = Readable.fromWeb(response.body as never);
	body.on('data', (chunk: Buffer) => hash.update(chunk));
	await pipeline(body, createWriteStream(file));
	return hash.digest('hex');
}

function extract(tarball: string, directory: string) {
	return new Promise<void>((resolve, reject) => {
		const child = spawn('tar', ['-xzf', tarball, '-C', directory], {
			stdio: ['ignore', 'inherit', 'inherit'],
		});
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`tar exited ${code} extracting ${tarball}`));
		});
	});
}

async function installBinary(cacheDir: string) {
	const url = releaseUrl();
	const expected = await readExpectedChecksum();
	await mkdir(dirname(cacheDir), { recursive: true });
	const workDir = await mkdtemp(`${cacheDir}.tmp-`);
	try {
		console.error(
			`${NAME}: downloading the app (about 56 MB, first run only)\n  ${url}`,
		);
		const tarball = join(workDir, 'release.tar.gz');
		const actual = await downloadTo(url, tarball);
		if (actual !== expected) {
			throw new Error(
				`${url}: sha256 mismatch (expected ${expected}, got ${actual})`,
			);
		}
		const extracted = join(workDir, 'extracted');
		await mkdir(extracted);
		await extract(tarball, extracted);
		if (!(await exists(join(extracted, NAME)))) {
			throw new Error(`${url}: archive has no ${NAME} executable`);
		}
		try {
			await rename(extracted, cacheDir);
		} catch (error) {
			// A concurrent run installed the identical release first.
			if (!(await exists(join(cacheDir, NAME)))) throw error;
		}
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
}

async function resolveBinary() {
	const override = process.env.GHIA_FLUID_FUNCTIONALISM_BINARY_PATH;
	if (override !== undefined && override !== '') {
		if (!(await exists(override))) {
			throw new Error(
				`GHIA_FLUID_FUNCTIONALISM_BINARY_PATH does not exist: ${override}`,
			);
		}
		return override;
	}

	const target = `${process.platform}-${process.arch}`;
	if (target !== TARGET) {
		throw new Error(
			`${NAME} only runs on Apple Silicon macOS (${TARGET}), detected ${target}`,
		);
	}

	const cacheDir = join(
		homedir(),
		'Library',
		'Caches',
		NAME,
		pkg.version,
		TARGET,
	);
	const binary = join(cacheDir, NAME);
	if (await exists(binary)) return binary;
	await installBinary(cacheDir);
	return binary;
}

function run(binary: string) {
	const child = spawn(binary, process.argv.slice(2), { stdio: 'inherit' });
	const forwarders = FORWARDED_SIGNALS.map((signal) => {
		const forward = () => child.kill(signal);
		process.on(signal, forward);
		return () => process.off(signal, forward);
	});
	child.on('error', (error) => {
		console.error(`${NAME}: failed to start ${binary}: ${error.message}`);
		process.exit(1);
	});
	child.on('exit', (code, signal) => {
		for (const remove of forwarders) remove();
		if (signal !== null) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 1);
	});
}

try {
	run(await resolveBinary());
} catch (error) {
	console.error(`${NAME}: ${error instanceof Error ? error.message : error}`);
	process.exit(1);
}
