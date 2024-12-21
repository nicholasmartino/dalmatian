import { Button } from './Button';

type NodeIOProps = {
	importNodes: (event: React.ChangeEvent<HTMLInputElement>) => void;
	exportNodes: () => void;
};

export const NodeIO = (props: NodeIOProps) => {
	const { importNodes: handleNodesImport, exportNodes: handleNodesExport } =
		props;

	return (
		<div>
			<Button
				onClick={() => document.getElementById('fileInput')?.click()}
			>
				Import Nodes
			</Button>
			<input
				id="fileInput"
				type="file"
				accept=".json"
				onChange={handleNodesImport}
				className="hidden"
			/>
			<Button onClick={handleNodesExport}>Export Nodes</Button>
		</div>
	);
};
