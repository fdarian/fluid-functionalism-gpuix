/** Inter's static cuts, one file per weight: gpuix loads no variable fonts. */
const dir = new URL("../../assets/fonts/", import.meta.url).pathname;

export const fonts = ["Regular", "Medium", "SemiBold", "Bold"].map(
	(cut) => `${dir}Inter-${cut}.ttf`,
);
