import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState } from 'react';
import InteractiveMap, {
	MapMouseEvent,
	Marker,
	MarkerDragEvent,
} from 'react-map-gl';
import { Node } from '../types/Node';
import { exportNodesToJson, importNodesFromJson } from '../utils/NodesIO';

const newGuid = () => {
	return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
		(
			+c ^
			(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
		).toString(16)
	);
};

export const Map: React.FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);

	const addNode = (event: MapMouseEvent) => {
		if (!isAddingNodes) return;
		const newNode: Node = {
			id: newGuid(),
			longitude: event.lngLat.lng,
			latitude: event.lngLat.lat,
		};
		setNodes((prevNodes: Node[]) => [...prevNodes, newNode]);
	};

	const updateNodeOnDrag = (nodeId: string, event: MarkerDragEvent) => {
		setNodes((prevNodes) =>
			prevNodes.map((node) =>
				node.id === nodeId
					? {
							...node,
							longitude: event.lngLat.lng,
							latitude: event.lngLat.lat,
					  }
					: node
			)
		);
	};

	const handleAddNode = () => {
		setIsAddingNodes(!isAddingNodes);
	};

	const handleNodesImport = (event: React.ChangeEvent<HTMLInputElement>) => {
		importNodesFromJson(event, setNodes);
	};

	const handleNodesExport = () => {
		exportNodesToJson(nodes);
	};

	return (
		<>
			<InteractiveMap
				mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
				initialViewState={{
					longitude: -123.1216,
					latitude: 49.2827,
					zoom: 11,
				}}
				style={{ width: '100vw', height: '90vh' }}
				mapStyle="mapbox://styles/mapbox/dark-v11"
				onClick={addNode}
			>
				{nodes.map((node: Node) => (
					<Marker
						key={node.id}
						longitude={node.longitude}
						latitude={node.latitude}
						anchor="bottom"
						draggable={true}
						onDragEnd={(event) => updateNodeOnDrag(node.id, event)}
					/>
				))}
			</InteractiveMap>

			<div className="absolute top-2 left-2 z-10 flex-col flex text-left">
				<button
					className={` ${
						isAddingNodes ? `text-cyan-700` : `text-gray-200`
					}`}
					onClick={handleAddNode}
				>
					Add Nodes
				</button>
				<button
					onClick={() =>
						document.getElementById('fileInput')?.click()
					}
				>
					Import Nodes
				</button>
				<input
					id="fileInput"
					type="file"
					accept=".json"
					onChange={handleNodesImport}
					className="hidden"
				/>
				<button onClick={handleNodesExport}>Export Nodes</button>
			</div>
		</>
	);
};
