import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	type TableSize,
} from "../components/table";

const PEOPLE = [
	{ name: "Alice", role: "Engineer", status: "Active" },
	{ name: "Bob", role: "Designer", status: "Away" },
	{ name: "Carol", role: "Manager", status: "Active" },
];

function PeopleTable(props: { size?: TableSize; testId: string }) {
	return (
		<Table size={props.size} testId={props.testId}>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{PEOPLE.map((person, index) => (
					<TableRow index={index} testId={`${props.testId}-row-${index}`}>
						<TableCell>{person.name}</TableCell>
						<TableCell>{person.role}</TableCell>
						<TableCell>{person.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export const title = "Table";
export const group = "Components";

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Basic">
				<PeopleTable testId="basic" />
			</DemoCard>
			<DemoCard title="Compact">
				<PeopleTable size="compact" testId="compact" />
			</DemoCard>
		</div>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic-row-0");
	shot.capture("hover-first-row");
	await shot.hover("basic-row-2");
	shot.capture("hover-last-row");
	await shot.hover("compact-row-1");
	shot.capture("hover-compact");
};
