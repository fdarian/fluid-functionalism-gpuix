import { join } from "node:path";

/** Inter's static cuts, one file per weight: gpuix loads no variable fonts. */
export const fonts = ["Regular", "Medium", "SemiBold", "Bold"].map((cut) =>
	join(import.meta.dir, "../../assets/fonts", `Inter-${cut}.ttf`),
);
