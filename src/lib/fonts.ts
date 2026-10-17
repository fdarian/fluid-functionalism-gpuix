import bold from '../../assets/fonts/Inter-Bold.ttf' with { type: 'file' };
import medium from '../../assets/fonts/Inter-Medium.ttf' with { type: 'file' };
import regular from '../../assets/fonts/Inter-Regular.ttf' with {
	type: 'file',
};
import semiBold from '../../assets/fonts/Inter-SemiBold.ttf' with {
	type: 'file',
};

/** Inter's static cuts, one file per weight: gpuix loads no variable fonts. */
export const fonts = [regular, medium, semiBold, bold];
