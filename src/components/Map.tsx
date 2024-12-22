import { booleanPointInPolygon, centroid } from '@turf/turf';
import { Feature, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import { around } from 'geokdbush';
import KDBush from 'kdbush';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useState } from 'react';
import InteractiveMap, {
	MapMouseEvent,
	Marker,
	MarkerDragEvent,
} from 'react-map-gl';
import { Node } from '../types/Node';
import { newGuid } from '../utils/GuidUtils';
import { exportNodesToJson, importNodesFromJson } from '../utils/NodesIO';
import { Box } from './Box';
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

	type Centroid = {
		id: string;
		coords: [number, number];
	};

	// New function to extract centroids from parcels
	const extractCentroids = (parcels: Geometry): Centroid[] => {
		return parcels.features.map(
			(feature: Feature<Polygon | MultiPolygon, GeoJsonProperties>) => {
				const centroidPoint = centroid(feature.geometry);
				return {
					id: feature.id || newGuid(), // Use feature ID or generate a new one
					coords: [
						centroidPoint.geometry.coordinates[0],
						centroidPoint.geometry.coordinates[1],
					],
				} as Centroid;
			}
		);
	};

	// New function to find nearest centroids and construct a graph
	const constructCentroidGraph = (centroids: Centroid[]) => {
		const spatialIndex = new KDBush(centroids.length);
		centroids.forEach((c) => spatialIndex.add(c.coords[0], c.coords[1]));
		spatialIndex.finish();

		const graph: Record<string, string> = {};
		const nearestIdsMap: Record<string, number[]> = {}; // Store nearest IDs for all centroids

		// Batch find nearest centroids
		centroids.forEach((centroid) => {
			const longitude = centroid.coords[0];
			const latitude = centroid.coords[1];
			nearestIdsMap[centroid.id] = around<number>(
				spatialIndex,
				longitude,
				latitude,
				2,
				1
			);
		});

		// Map nearest IDs to graph
		centroids.forEach((centroid) => {
			graph[centroid.id] = centroids[nearestIdsMap[centroid.id][0]].id;
		});
		return graph;
	};

	const findIslands = (edges: Record<string, string[]>): string[][] => {
		// Step 2: Find connected components using DFS
		const visited = new Set<string>();
		const components: string[][] = [];

		const dfs = (node: string, component: string[]) => {
			visited.add(node);
			component.push(node);
			for (const neighbor of edges[node]) {
				if (!visited.has(neighbor)) dfs(neighbor, component);
			}
		};

		for (const node in edges) {
			if (visited.has(node)) continue;
			const component: string[] = [];
			dfs(node, component);
			components.push(component);
		}

		return components;
	};

	// New function to handle extraction and graph construction
	const handleParcelsAndGraphConstruction = (
		parcels: Geometry,
		polygon: Feature<Polygon | MultiPolygon, GeoJsonProperties>
	) => {
		const filteredParcels = extractParcelsInsideCircle(parcels, polygon);
		const centroids = extractCentroids(filteredParcels);
		const centroidGraph = constructCentroidGraph(centroids);
		console.log('Centroid Graph:', centroidGraph); // Log the graph for debugging
		return filteredParcels;
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
							geometry={handleParcelsAndGraphConstruction(
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
