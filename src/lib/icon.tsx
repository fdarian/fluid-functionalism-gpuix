import { type IconRef, iconSource } from "./icons";

export function Icon(props: {
	name: IconRef;
	size: number;
	strokeWidth: number;
	color: string;
}) {
	return (
		<svg
			source={iconSource(props.name, props.strokeWidth)}
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				color: props.color,
			}}
		/>
	);
}
