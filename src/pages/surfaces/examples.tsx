import { type HostElement, ResizeObserver } from '@gpuix/solid';
import {
	type Accessor,
	createSignal,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';
import { ColorPicker } from '#/components/color-picker';
import { ComponentPreview } from '#/lib/doc-page';
import { color, surface } from '#/lib/theme';
import {
	ANNOTATION_BLUE,
	type ArrowDial,
	ArrowOverlay,
	buildArrow,
	Callout,
} from './annotations';
import { InviteDialog } from './invite-dialog';
import { COLOR_PICKER_CODE, INVITE_DIALOG_CODE } from './snippets';
import { createVisibility } from './visibility';

/** Hand-tuned transforms for the two solution callouts. */
const SOLUTION_VALUES: Record<'dialog' | 'dropdown', ArrowDial> = {
	dialog: { x: 0, y: -60, rotation: 20, curve: -10, labelX: 0, labelY: -30 },
	dropdown: { x: 0, y: 0, rotation: 0, curve: 10, labelX: 10, labelY: 10 },
};

const DIALOG_LABEL_WIDTH = 72;
const DROPDOWN_LABEL_WIDTH = 92;

interface Box {
	left: number;
	top: number;
	right: number;
	width: number;
	height: number;
}

interface Geometry {
	width: number;
	height: number;
	dialog: Box;
	dropdown: Box;
}

/**
 * Two blue callouts for the solution: one on the dialog (surface-5), one on the
 * role dropdown (surface-7). The dialog is fluid, so their positions are
 * measured; the swatches name the level each surface was given.
 */
function SolutionAnnotations(props: {
	container: () => HostElement | undefined;
	dialog: () => HostElement | undefined;
	dropdown: () => HostElement | undefined;
}) {
	const [geometry, setGeometry] = createSignal<Geometry>();
	onMount(() => {
		const container = props.container();
		const dialog = props.dialog();
		const dropdown = props.dropdown();
		if (
			container === undefined ||
			dialog === undefined ||
			dropdown === undefined
		) {
			throw new Error('The annotated surfaces are not mounted');
		}
		const measure = () => {
			const frame = container.getBoundingClientRect();
			const relative = (element: HostElement): Box => {
				const bounds = element.getBoundingClientRect();
				return {
					left: bounds.x - frame.x,
					top: bounds.y - frame.y,
					right: bounds.x + bounds.width - frame.x,
					width: bounds.width,
					height: bounds.height,
				};
			};
			setGeometry({
				width: frame.width,
				height: frame.height,
				dialog: relative(dialog),
				dropdown: relative(dropdown),
			});
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		observer.observe(dialog);
		observer.observe(dropdown);
		onCleanup(() => observer.disconnect());
	});

	return (
		<Show when={geometry()}>
			{(geo: Accessor<Geometry>) => {
				const dialogEnd = () => ({
					x: geo().dialog.left + 12,
					y: geo().dialog.top + geo().dialog.height * 0.4,
				});
				const dropdownEnd = () => ({
					x: geo().dropdown.right - 2,
					y: geo().dropdown.top + geo().dropdown.height * 0.22,
				});
				const dropdownLabelLeft = () => geo().width - DROPDOWN_LABEL_WIDTH - 4;
				const arrows = () => [
					{
						...buildArrow(
							{ x: geo().dialog.left - 16, y: dialogEnd().y + 26 },
							dialogEnd(),
							SOLUTION_VALUES.dialog,
						),
						color: ANNOTATION_BLUE,
					},
					{
						...buildArrow(
							{ x: dropdownLabelLeft(), y: dropdownEnd().y + 24 },
							dropdownEnd(),
							SOLUTION_VALUES.dropdown,
						),
						color: ANNOTATION_BLUE,
					},
				];
				return (
					<>
						<ArrowOverlay
							width={geo().width}
							height={geo().height}
							arrows={arrows()}
						/>
						<Callout
							title="Dialog"
							hex={surface(5)}
							left={
								geo().dialog.left -
								DIALOG_LABEL_WIDTH -
								16 +
								SOLUTION_VALUES.dialog.labelX
							}
							top={dialogEnd().y + 6 + SOLUTION_VALUES.dialog.labelY}
							width={DIALOG_LABEL_WIDTH}
						/>
						<Callout
							title="Role dropdown"
							hex={surface(7)}
							left={dropdownLabelLeft() + SOLUTION_VALUES.dropdown.labelX}
							top={dropdownEnd().y + 10 + SOLUTION_VALUES.dropdown.labelY}
							width={DROPDOWN_LABEL_WIDTH}
						/>
					</>
				);
			}}
		</Show>
	);
}

export function InviteDialogDemo() {
	const [container, setContainer] = createSignal<HostElement>();
	const [dialog, setDialog] = createSignal<HostElement>();
	const [dropdown, setDropdown] = createSignal<HostElement>();
	return (
		<ComponentPreview
			scheme="dark"
			testId="invite"
			code={INVITE_DIALOG_CODE}
			padding="compact"
		>
			<div
				ref={setContainer}
				style={{
					position: 'relative',
					width: '100%',
					minHeight: 640,
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 24,
					borderRadius: 16,
					overflow: 'hidden',
					backgroundColor: color.background,
				}}
			>
				<InviteDialog
					variant="solution"
					ref={setDialog}
					menuRef={setDropdown}
					style={{ position: 'relative', width: '100%', maxWidth: 320 }}
				/>
				<SolutionAnnotations
					container={container}
					dialog={dialog}
					dropdown={dropdown}
				/>
			</div>
		</ComponentPreview>
	);
}

export function ColorPickerDemo() {
	const visibility = createVisibility(0.5);
	return (
		<ComponentPreview
			scheme="dark"
			testId="color-picker"
			code={COLOR_PICKER_CODE}
			padding="compact"
		>
			<div
				ref={visibility.ref}
				style={{
					position: 'relative',
					width: '100%',
					minHeight: 520,
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'flex-start',
					justifyContent: 'center',
					paddingTop: 48,
					paddingBottom: 48,
					borderRadius: 16,
					overflow: 'hidden',
					backgroundColor: color.background,
				}}
			>
				{/* The picker opens its format menu on mount: mounted off screen, that menu would be clamped into the window, or dismissed by a click the visitor made elsewhere. */}
				<Show when={visibility.visible()}>
					<ColorPicker defaultValue="#6B97FF" defaultFormatOpen />
				</Show>
			</div>
		</ComponentPreview>
	);
}
