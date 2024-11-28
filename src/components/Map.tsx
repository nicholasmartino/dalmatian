import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState } from 'react';
import InteractiveMap, {
	MapMouseEvent,
	Marker,
	MarkerDragEvent,
} from 'react-map-gl';
import { Node } from '../types/Node';
import { exportNodesToJson, importNodesFromJson } from '../utils/NodesIO';
import { spatialDispersionIndex as calculateSpatialDispersionIndex } from '../utils/SpatialStats';

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
	const [isRemovingNodes, setIsRemovingNodes] = useState<boolean>(false);

	const addNode = (event: MapMouseEvent) => {
		if (!isAddingNodes) return;
		const newNode: Node = {
			id: newGuid(),
			longitude: event.lngLat.lng,
			latitude: event.lngLat.lat,
			density: 1,
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

	const deleteNode = (nodeId: string) => {
		if (!isRemovingNodes) return;
		setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));
	};

	const handleAddNode = () => {
		setIsAddingNodes(!isAddingNodes);
		setIsRemovingNodes(false);
	};

	const handleRemoveNode = () => {
		setIsRemovingNodes(!isRemovingNodes);
		setIsAddingNodes(false);
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
				onContextMenu={(e) => e.preventDefault()}
			>
				{nodes.map((node: Node) => (
					<Marker
						key={node.id}
						longitude={node.longitude}
						latitude={node.latitude}
						anchor="center"
						draggable={true}
						onDragStart={() => setIsRemovingNodes(false)}
						onDragEnd={(event) => updateNodeOnDrag(node.id, event)}
						onClick={() => deleteNode(node.id)}
					/>
				))}
			</InteractiveMap>

			<Box className="top-2 left-2">
				<Button
					className={` ${
						isAddingNodes ? `text-cyan-800` : `text-gray-200`
					}`}
					onClick={handleAddNode}
				>
					Add Nodes
				</Button>
				<Button
					className={` ${
						isRemovingNodes ? `text-cyan-800` : `text-gray-200`
					}`}
					onClick={handleRemoveNode}
				>
					Remove Nodes
				</Button>
				<Button
					onClick={() =>
						document.getElementById('fileInput')?.click()
					}
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
			</Box>

			<Box
				className="top-2 right-2 text-right"
				key={JSON.stringify(nodes)}
			>
				Spatial Dispersion Index{' '}
				<b>{calculateSpatialDispersionIndex(nodes).toLocaleString()}</b>
			</Box>
		</>
	);
};

type BoxProps = {
	children: React.ReactNode;
	className?: string;
};

const Box = (props: BoxProps) => {
	const { children, className } = props;
	return (
		<div
			className={`absolute z-10 flex-col flex text-left border-cyan-800 border-2 rounded-lg p-4 ${className}`}
		>
			{children}
		</div>
	);
};

type ButtonProps = {
	onClick: () => void;
	children: React.ReactNode;
	className?: string;
};

const Button = (props: ButtonProps) => {
	const { onClick, children, className } = props;
	return (
		<button
			onClick={onClick}
			className={`text-left w-full hover:text-cyan-600 ${className}`}
		>
			{children}
		</button>
	);
};
