import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useMemo, useState } from 'react';
import InteractiveMap, {
	MapMouseEvent,
	Marker,
	MarkerDragEvent,
} from 'react-map-gl';
import { Node } from '../types/Node';
import { newGuid } from '../utils/GuidUtils';
import { exportNodesToJson, importNodesFromJson } from '../utils/NodesIO';
import { Box } from './Box';
import { BuildingFootprintGenerator } from './BuildingFootprintGenerator';
import { Cluster } from './Cluster';
import { generateCircleGeoJSON, GeoJsonLayer, Geometry } from './GeoJSON';
import { Input } from './Input';
import { OutputMetrics } from './Metric';
import { NodeEditor } from './NodeEditor';
import { NodeIO } from './NodeIO';

export const Map: React.FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);
	const [isRemovingNodes, setIsRemovingNodes] = useState<boolean>(false);
	const [radius, setRadius] = useState<number>(1600);
	const [parcels, setParcels] = useState<Geometry>({} as Geometry);
	const [footprints, setFootprints] =
		useState<GeoJSON.FeatureCollection | null>(null);
	const [showFootprints, setShowFootprints] = useState<boolean>(true);
	const clusters = useMemo(() => generateCircleGeoJSON(nodes), [nodes]);

	useEffect(() => {
		// Fetch GeoJSON from the public/data folder
		fetch('./data/ParcelFSR.geojson')
			.then((response) => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then((data: Geometry) => {
				setParcels(data);
			})
			.catch((error) => console.error('Error loading GeoJSON:', error));
	}, []);

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
					geometry={clusters}
					opacity={0}
					strokeColor="cyan"
					strokeWidth={2}
				/>
				<GeoJsonLayer
					id="parcels"
					geometry={parcels}
					color={{
						property: 'fsr',
						stops: [
							[0, '#3288bd'],
							[1, '#66c2a5'],
							[2, '#abdda4'],
							[3, '#e6f598'],
							[4, '#ffffbf'],
							[5, '#fee08b'],
							[6, '#fdae61'],
							[7, '#f46d43'],
							[8, '#d53e4f'],
						],
					}}
					opacity={0.1}
				/>

				{/* Footprints layer */}
				{footprints && showFootprints && (
					<GeoJsonLayer
						id="footprints"
						geometry={footprints as any}
						color="#00ffff"
						opacity={0.7}
						strokeColor="#00ffff"
						strokeWidth={2}
					/>
				)}

				{parcels?.features &&
					clusters?.features &&
					clusters.features.map((buffer, i) => (
						<Cluster
							key={buffer.id}
							index={i}
							geometry={parcels}
							boundary={buffer}
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

				{/* Footprint controls in a separate box for proper stacking */}
				{parcels?.features && clusters?.features && (
					<>
						<br />
						<BuildingFootprintGenerator
							parcels={parcels}
							clusters={clusters}
							onFootprintsGenerated={setFootprints}
							modelPath="/data/model/model.json"
						/>
					</>
				)}
			</Box>

			{/* Metrics UI */}
			<OutputMetrics nodes={nodes} />
		</>
	);
};
