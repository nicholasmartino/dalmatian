import { booleanPointInPolygon, centroid } from '@turf/turf';
import { Feature, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useState } from 'react';
import InteractiveMap, {
	MapMouseEvent,
	Marker,
	MarkerDragEvent,
} from 'react-map-gl';
import { Node } from '../types/Node';
import { exportNodesToJson, importNodesFromJson } from '../utils/NodesIO';
import { Box } from './Box';
import { Button } from './Button';
import { generateCircleGeoJSON, GeoJsonLayer, Geometry } from './GeoJSON';
import { Input } from './Input';
import { OutputMetrics } from './Metric';

const newGuid = () => {
	return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
		(
			+c ^
			(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
		).toString(16)
	);
};

type NodeEditorProps = {
	isAddingNodes: boolean;
	isRemovingNodes: boolean;
	addNode: () => void;
	removeNode: () => void;
};

const NodeEditor = (props: NodeEditorProps) => {
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

type NodeIOProps = {
	importNodes: (event: React.ChangeEvent<HTMLInputElement>) => void;
	exportNodes: () => void;
};

const NodeIO = (props: NodeIOProps) => {
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

export const Map: React.FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);
	const [isRemovingNodes, setIsRemovingNodes] = useState<boolean>(false);
	const [radius, setRadius] = useState<number>(1600);
	const [parcelData, setParcelData] = useState<Geometry>({} as Geometry);
	const [nodeBuffers, setNodeBuffers] = useState<Geometry>({} as Geometry);

	useEffect(() => {
		// Fetch GeoJSON from the public/data folder
		fetch('./data/Parcel.geojson')
			.then((response) => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then((data: Geometry) => {
				setParcelData(data);
			})
			.catch((error) => console.error('Error loading GeoJSON:', error));
	}, []);

	useEffect(() => {
		setNodeBuffers(generateCircleGeoJSON(nodes));
	}, [nodes]);

	const addNode = (event: MapMouseEvent) => {
		if (!isAddingNodes) return;
		const newNode: Node = {
			id: newGuid(),
			longitude: event.lngLat.lng,
			latitude: event.lngLat.lat,
			density: 1,
			radius: radius,
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
		setNodes((nodes: Node[]) => nodes.filter((n: Node) => n.id !== nodeId));
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

	const setNodeRadii = (radius: number) => {
		setRadius(radius);
		setNodes((nodes: Node[]) =>
			nodes.map((n: Node) => ({
				...n,
				radius: radius,
			}))
		);
	};

	// New function to extract parcel features inside the merged circle
	const extractParcelsInsideCircle = (
		parcels: Geometry,
		mergedCircle: Feature<Polygon | MultiPolygon, GeoJsonProperties>
	): Geometry => {
		return {
			type: 'FeatureCollection' as const,
			features: parcels.features.filter(
				(feature: Feature<Polygon | MultiPolygon, GeoJsonProperties>) =>
					booleanPointInPolygon(
						centroid(feature.geometry),
						mergedCircle.geometry
					)
			),
		};
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
				style={{ width: '100vw', height: '100vh' }}
				mapStyle="mapbox://styles/mapbox/dark-v11"
				onClick={addNode}
				onContextMenu={(e) => e.preventDefault()}
			>
				{/* Render Markers */}
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

				<GeoJsonLayer
					id="buffers"
					geometry={nodeBuffers}
					color="cyan"
					opacity={0.5}
				/>
				<GeoJsonLayer
					id="parcels"
					geometry={parcelData}
					color="gray"
					opacity={0.1}
				/>
				{parcelData?.features &&
					nodeBuffers?.features &&
					nodeBuffers.features.map((buffer, i) => (
						<GeoJsonLayer
							key={i}
							id={`selected-${i}`}
							geometry={extractParcelsInsideCircle(
								parcelData,
								buffer
							)}
							color="white"
							opacity={0.2}
						/>
					))}
			</InteractiveMap>

			{/* Control UI */}
			<Box className="top-2 left-2">
				<NodeEditor
					isAddingNodes={isAddingNodes}
					isRemovingNodes={isRemovingNodes}
					addNode={handleAddNode}
					removeNode={handleRemoveNode}
				/>
				<NodeIO
					importNodes={handleNodesImport}
					exportNodes={handleNodesExport}
				/>
				<Input
					label="Radius"
					value={radius}
					setValue={setNodeRadii}
					unit="m"
				/>
			</Box>

			{/* Metrics UI */}
			<OutputMetrics nodes={nodes} />
		</>
	);
};
