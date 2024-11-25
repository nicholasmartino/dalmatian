import { Node } from '../types/Node';

export const exportNodesToJson = (nodes: Node[]) => {
	const jsonString = JSON.stringify(nodes, null, 2);
	const blob = new Blob([jsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = 'nodes.json';
	document.body.appendChild(link);
	link.click();

	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

export const importNodesFromJson = (
	event: React.ChangeEvent<HTMLInputElement>,
	setNodes: React.Dispatch<React.SetStateAction<Node[]>>
) => {
	const file = event.target.files?.[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const importedNodes = JSON.parse(e.target?.result as string);
			if (
				Array.isArray(importedNodes) &&
				importedNodes.every(
					(node) =>
						typeof node === 'object' &&
						'id' in node &&
						'longitude' in node &&
						'latitude' in node
				)
			) {
				setNodes(importedNodes);
			} else {
				alert('Invalid JSON format');
			}
		} catch (error) {
			alert('Error reading file');
		}
	};
	reader.readAsText(file);
	// Reset the input value so the same file can be imported again
	event.target.value = '';
};
