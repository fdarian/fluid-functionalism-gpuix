import {
	AnimatePresence,
	type MotionTransition,
	motion,
	type StyleDesc,
} from '@ghia/solid';
import { createSignal, Show } from 'solid-js';
import { Button } from '#/components/button';
import { ComponentPreview, MONO } from '#/lib/doc-page';
import {
	color,
	siteType,
	motion as tween,
	twShadow,
	withAlpha,
} from '#/lib/theme';

const MODAL_CODE = `// Both modals open on spring.slow. Only the exit differs.

// ❌ Slow exit — same 0.4s as the enter, drags on the way out
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
  transition={spring.slow}
/>

// ✅ Faster exit — leaves on spring.slow.exit (0.16s tween)
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95, transition: spring.slow.exit }}
  transition={spring.slow}
/>`;

/** The slow exit `{ duration: 0.4 }`: as long as the enter. */
const SAME_EXIT = { duration: 0.4 } satisfies MotionTransition;

function Bar(props: { style: StyleDesc }) {
	return (
		<div
			style={{
				flexShrink: 0,
				borderRadius: 9999,
				...props.style,
			}}
		/>
	);
}

function ModalFrame(props: {
	testId: string;
	open: boolean;
	exitTransition: MotionTransition;
}) {
	const faint = (alpha: number) => withAlpha(color.foreground, alpha);

	return (
		<div
			testId={props.testId}
			style={{
				position: 'relative',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: 200,
				width: '100%',
				overflow: 'hidden',
				borderRadius: 12,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.background,
			}}
		>
			<AnimatePresence>
				<Show when={props.open}>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0, transition: props.exitTransition }}
						transition={tween.slow}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: faint(0.05),
						}}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95, transition: props.exitTransition }}
						transition={tween.slow}
						style={{
							position: 'relative',
							width: '80%',
							display: 'flex',
							flexDirection: 'column',
							gap: 10,
							padding: 16,
							borderRadius: 12,
							borderStyle: 'solid',
							borderWidth: 1,
							borderColor: color.border,
							backgroundColor: color.card,
							boxShadow: twShadow.xl,
						}}
					>
						<Bar
							style={{
								position: 'absolute',
								top: 12,
								right: 12,
								width: 16,
								height: 16,
								backgroundColor: faint(0.1),
							}}
						/>
						<Bar
							style={{ width: '50%', height: 12, backgroundColor: faint(0.1) }}
						/>
						<Bar
							style={{
								marginTop: 4,
								width: '100%',
								height: 8,
								backgroundColor: faint(0.06),
							}}
						/>
						<Bar
							style={{ width: '100%', height: 8, backgroundColor: faint(0.06) }}
						/>
						<Bar
							style={{ width: '40%', height: 8, backgroundColor: faint(0.06) }}
						/>
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								justifyContent: 'flex-end',
								gap: 8,
								marginTop: 12,
							}}
						>
							<div
								style={{
									flexShrink: 0,
									width: 64,
									height: 24,
									borderRadius: 6,
									backgroundColor: faint(0.1),
								}}
							/>
							<div
								style={{
									flexShrink: 0,
									width: 64,
									height: 24,
									borderRadius: 6,
									backgroundColor: faint(0.1),
								}}
							/>
						</div>
					</motion.div>
				</Show>
			</AnimatePresence>
		</div>
	);
}

function Side(props: {
	slug: 'same' | 'faster';
	exitTransition: MotionTransition;
	mark: string;
	caption: string;
	toggleLabel: string;
}) {
	const [open, setOpen] = createSignal(false);
	return (
		<div
			style={{
				flexGrow: 1,
				flexBasis: 0,
				minWidth: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<ModalFrame
				testId={`modal-${props.slug}-frame`}
				open={open()}
				exitTransition={props.exitTransition}
			/>
			<Button
				testId={`modal-${props.slug}-toggle`}
				variant="secondary"
				size="compact"
				aria-label={props.toggleLabel}
				onClick={() => setOpen(!open())}
			>
				Toggle modal
			</Button>
			<text
				style={{
					...siteType.caption,
					color: color.mutedForeground,
					textAlign: 'center',
				}}
			>
				{props.mark} {props.caption}
			</text>
		</div>
	);
}

export function ModalExitDemo() {
	return (
		<ComponentPreview testId="modal-exit" code={MODAL_CODE} minHeight={320}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 16,
					width: '100%',
					maxWidth: 672,
				}}
			>
				{/* Independent state per side, so one can be toggled and then the other, back to back. */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						gap: 20,
						width: '100%',
					}}
				>
					<Side
						slug="same"
						exitTransition={SAME_EXIT}
						mark="❌"
						caption="Same exit time — drags on the way out"
						toggleLabel="Toggle the modal with the same exit speed"
					/>
					<Side
						slug="faster"
						exitTransition={tween.slowExit}
						mark="✅"
						caption="Faster exit — gone a tier quicker"
						toggleLabel="Toggle the modal with the faster exit speed"
					/>
				</div>
				<text
					style={{
						...siteType.caption,
						color: color.mutedForeground,
						textAlign: 'center',
					}}
				>
					Toggle one, then the other — both open on{' '}
					<span style={{ fontFamily: MONO }}>spring.slow</span>; only the close
					differs.
				</text>
			</div>
		</ComponentPreview>
	);
}
