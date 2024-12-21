import { Button } from './Button';

type NodeEditorProps = {
	isAddingNodes: boolean;
	isRemovingNodes: boolean;
	addNode: () => void;
	removeNode: () => void;
};

export const NodeEditor = (props: NodeEditorProps) => {
	const { isAddingNodes, isRemovingNodes, addNode, removeNode } = props;
	return (
		<div>
			<Button
				className={` ${
					isAddingNodes ? `text-cyan-800` : `text-gray-200`
				}`}
				onClick={addNode}
			>
				Add Nodes
			</Button>
			<Button
				className={` ${
					isRemovingNodes ? `text-cyan-800` : `text-gray-200`
				}`}
				onClick={removeNode}
			>
				Remove Nodes
			</Button>
		</div>
	);
};
