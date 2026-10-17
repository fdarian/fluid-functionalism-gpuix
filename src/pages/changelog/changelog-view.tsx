import { For } from 'solid-js';
import type { Release } from '#/lib/changelog/parse';
import { buildUpgradePrompt } from '#/lib/changelog/upgrade-prompt';
import { CopyPromptButton, Prose } from '#/lib/doc-page';
import { PagePlaybackProvider } from './preview-stage';
import { ReleaseSection } from './release-section';
import { createReleaseSpy } from './release-spy';

/**
 * The changelog's body under `App`'s heading: the intro line and the Copy
 * upgrade prompt button, then one section per release down a shared timeline.
 * The source also links the page as Markdown; the port has no such route.
 */
export function ChangelogView(props: { releases: readonly Release[] }) {
	const sectionRef = createReleaseSpy(
		props.releases.map((release) => release.month),
	);
	return (
		<PagePlaybackProvider>
			{/* width: 100% on every column down to Entry (this file, release-section, entry): auto-width nested flex columns make gpuix's layout cost ~1.9x per level (README, Bugs); the chain of 8 drew in 121 ms, 20 ms with it. */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 32,
					width: '100%',
				}}
			>
				{/* The heading is `App`'s, a column gap above; the source sets the intro 8px under its title. */}
				<div
					style={{ marginTop: -16, display: 'flex', flexDirection: 'column' }}
				>
					<Prose>
						Every change, month by month. A release lands on the first Friday.
					</Prose>
					{/* For an agent doing the upgrade: the skill first, then the same job by hand. */}
					<div style={{ marginTop: 16, width: 'fit-content' }}>
						<CopyPromptButton
							label="Copy upgrade prompt"
							variant="secondary"
							testId="copy-upgrade-prompt"
							prompt={buildUpgradePrompt()}
						/>
					</div>
				</div>
				<div
					style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
				>
					<For each={props.releases}>
						{(release, index) => (
							<ReleaseSection
								release={release}
								first={index() === 0}
								sectionRef={sectionRef(release.month)}
							/>
						)}
					</For>
				</div>
			</div>
		</PagePlaybackProvider>
	);
}
