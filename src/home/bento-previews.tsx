import type { JSX } from "solid-js";

/** Slug -> the live preview a home tile shows; a slug with no entry renders an empty stage. */
export const previewMap: Record<string, () => JSX.Element> = {};
