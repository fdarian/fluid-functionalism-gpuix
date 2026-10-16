import type { JSX } from 'solid-js';
import type { ShotContext } from '#/lib/demo';
import { DocPage, DocSection, Prose } from '#/lib/doc-page';
import { setSizeChoice, setThemeChoice } from '#/lib/theme';
import { TYPOGRAPHY_INSTALL_PROMPT } from '#/pages/typography/install-prompt';
import { TypesetSample } from '#/pages/typography/markdown';
import { NumbersDemo } from '#/pages/typography/numbers';
import { GapTable, TypeScaleSpecimen } from '#/pages/typography/scale';
import { BulletList, H3, Rule, Sentence } from '#/pages/typography/text';
import { TrimDemo } from '#/pages/typography/trim';
import { WeightOpszDemo } from '#/pages/typography/weight';
import { BalanceDemo, PrettyDemo } from '#/pages/typography/wrap';

export const title = 'Typography';
export const group = 'System';
/** The sidebar's System group is alphabetical: Fluid Hover, Motion, Scrollbars, Sizes, Skill, Surfaces, Typography. */
export const order = 7;
export const layout = 'docs';
export const listed = 'sidebar';

/** `systemList`'s description of the page, which the source's site menu splits into keywords. */
const LIST_DESCRIPTION =
	'Bold rules that create consistency across the whole component library.';
export const menuKeywords = ['typography', ...LIST_DESCRIPTION.split(/\W+/)];

export async function scenarios(shot: ShotContext) {
	const scrollTo = async (testId: string) => {
		let last = Number.NaN;
		for (let tick = 0; tick < 80; tick++) {
			const centre = shot.centerOf(testId);
			// The page's end stops the scroll before the element reaches the top.
			if (centre.y < 460 || centre.y === last) return;
			last = centre.y;
			await shot.scroll(600, 400, 0, 300);
		}
		throw new Error(`${testId} never scrolled into view`);
	};

	await scrollTo('type-scale');
	shot.capture('scale');
	setSizeChoice('compact');
	await shot.settle(600);
	shot.capture('scale-compact');
	setSizeChoice('default');
	await shot.settle(600);
	await scrollTo('markdown-sample');
	await shot.scroll(600, 400, 0, -420);
	shot.capture('markdown');
	// The to-dos check and uncheck; a hovered box darkens its outline.
	await shot.click('task-move-every-list-to-fluid-hover');
	await shot.hover('task-command-menu');
	shot.capture('markdown-todo');
	setSizeChoice('compact');
	await shot.settle(600);
	shot.capture('markdown-compact');
	setSizeChoice('default');
	await shot.settle(600);
	setThemeChoice('light');
	await shot.settle(600);
	shot.capture('markdown-light');
	setThemeChoice('dark');
	await shot.settle(600);
	await scrollTo('gap-table');
	shot.capture('spacing');
	await scrollTo('tweak-weight');
	await shot.hover('tweak-weight');
	shot.capture('weight');
	await shot.click('weight-plain');
	shot.capture('weight-unselected');
	await scrollTo('tweak-numbers');
	await shot.hover('tweak-numbers');
	await shot.settle(1500);
	shot.capture('numbers');
	await scrollTo('tweak-trim');
	shot.capture('trim');
	await scrollTo('tweak-balance');
	shot.capture('balance');
	await scrollTo('tweak-pretty');
	shot.capture('pretty');
}

export function Page(): JSX.Element {
	return (
		<DocPage
			description={
				<Prose>
					Bold rules that create consistency across the whole component library.
				</Prose>
			}
			intro="Typography is hard. Every style you add makes it clunkier, so building this page was mostly cutting and refactoring until only the essential rules remained. Those rules power every component in the library, and each one is simple. Defining them and applying them on every surface is what makes it hard. Good rules hold every kind of component, and every component holds to them. Enjoy!"
			installNote="The 5 styles for any text, markdown included."
			installPrompt={TYPOGRAPHY_INSTALL_PROMPT}
		>
			<DocSection title="5 rules">
				<BulletList>
					<Rule>
						<Prose>
							5 styles for the whole site, from page titles to captions.
						</Prose>
					</Rule>
					<Rule>
						<Prose>
							3 weights: regular for text, semibold for headings and selected
							items, bold for page titles.
						</Prose>
					</Rule>
					<Rule>
						<Prose>2 text colors: foreground and muted.</Prose>
					</Rule>
					<Rule>
						<Sentence
							parts={[
								'1 font family: ',
								{
									link: 'Inter Variable 4.0',
									href: 'https://rsms.me/inter/',
									after: '.',
								},
							]}
						/>
					</Rule>
					<Rule>
						<Prose>1 paragraph style.</Prose>
					</Rule>
				</BulletList>
			</DocSection>

			<DocSection title="5 no-gos">
				<BulletList>
					<Rule>
						<Prose>No uppercase: hierarchy comes from size and weight.</Prose>
					</Rule>
					<Rule>
						<Prose>
							No letter-spacing: handled with Inter's optical sizing.
						</Prose>
					</Rule>
					<Rule>
						<Prose>No eyebrows: a section starts with its title.</Prose>
					</Rule>
					<Rule>
						<Prose>
							No difference with markdown: it uses the same styles and colors as
							everything else.
						</Prose>
					</Rule>
					<Rule>
						<Prose>
							No opacity for text: it's foreground or muted, never a faded step
							of them.
						</Prose>
					</Rule>
				</BulletList>
			</DocSection>

			<DocSection title="The scale">
				<Sentence
					parts={[
						'5 styles, each a size and a line height. Press',
						{ code: 'S' },
						'for compact.',
					]}
				/>
				<TypeScaleSpecimen />
			</DocSection>

			<DocSection title="Markdown">
				<Prose>
					Markdown gets the same 5 styles, to-dos and tables included.
				</Prose>
				<TypesetSample />
			</DocSection>

			<DocSection title="Spacing">
				<Prose>
					Space only goes above a block, so streaming text never shifts.
				</Prose>
				<GapTable />
			</DocSection>

			<DocSection title="5 tweaks">
				<Prose>
					Small details that keep text still, snug in its box, and evenly
					wrapped.
				</Prose>

				<H3 marginTop={8}>Weight without reflow</H3>
				<Sentence
					parts={[
						'Each weight carries its own optical size, so semibold labels keep their width. Idea from ',
						{
							link: '@lochieaxon',
							href: 'https://x.com/lochieaxon/status/2061631101999968701',
							after: '.',
						},
					]}
				/>
				<WeightOpszDemo />

				<H3 marginTop={24}>Steady numbers</H3>
				<Sentence
					parts={[
						'Changing numbers use',
						{ code: 'tabular-nums' },
						'so every digit is the same width and the words after them hold still.',
					]}
				/>
				<NumbersDemo />

				<H3 marginTop={24}>Trimmed labels</H3>
				<Sentence
					parts={[
						'Labels use',
						{ code: 'text-box: trim-both cap alphabetic' },
						'so the padding you set is the space you see. Idea from ',
						{
							link: '@jakubkrehel',
							href: 'https://interfaces.dev/magazine/issues/working-with-type',
							after: '.',
						},
					]}
				/>
				<TrimDemo />

				<H3 marginTop={24}>Balanced headings</H3>
				<Sentence
					parts={[
						'Headings use',
						{ code: 'text-wrap: balance' },
						'so their lines come out even.',
					]}
				/>
				<BalanceDemo />

				<H3 marginTop={24}>Pretty paragraphs</H3>
				<Sentence
					parts={[
						'Paragraphs use',
						{ code: 'text-wrap: pretty' },
						'so none ends on a lone word.',
					]}
				/>
				<PrettyDemo />
			</DocSection>
		</DocPage>
	);
}
