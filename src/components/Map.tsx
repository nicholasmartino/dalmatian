import {
	booleanPointInPolygon,
	centroid,
	featureCollection,
	union,
} from '@turf/turf';
import {
	Feature,
	FeatureCollection,
	GeoJsonProperties,
	MultiPolygon,
	Polygon,
} from 'geojson';
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
						<ProcessedParcel
							index={i}
							parcelData={parcelData}
							buffer={buffer}
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

type ProcessedBufferProps = {
	index: number;
	parcelData: Geometry;
	buffer: Feature<Polygon | MultiPolygon, GeoJsonProperties>;
};

export const ProcessedParcel = (props: ProcessedBufferProps) => {
	const { index, parcelData, buffer } = props;

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
		id: number;
		coords: [number, number];
	};

	// New function to extract centroids from parcels
	const extractCentroids = (parcels: Geometry): Centroid[] => {
		return parcels.features.map(
			(feature: Feature<Polygon | MultiPolygon, GeoJsonProperties>) => {
				const centroidPoint = centroid(feature.geometry);
				return {
					id: feature.properties?.id, // Use feature ID or generate a new one
					coords: [
						centroidPoint.geometry.coordinates[0],
						centroidPoint.geometry.coordinates[1],
					],
				} as Centroid;
			}
		);
	};

	type Link = {
		from: number;
		to: number[];
	};

	// New function to find nearest centroids and construct a graph
	const constructCentroidGraph = (centroids: Centroid[]): Link[] => {
		const spatialIndex = new KDBush(centroids.length);
		centroids.forEach((c) => spatialIndex.add(c.coords[0], c.coords[1]));
		spatialIndex.finish();

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
				10
			);
		});

		// Map nearest IDs to graph
		const graph: Link[] = centroids.map((centroid) => {
			return {
				from: centroid.id,
				to: nearestIdsMap[centroid.id].map((i) => centroids[i].id),
			};
		});
		return graph;
	};

	const findIslands = (links: Link[]): number[][] => {
		const visited = new Set<number>();
		const islands: number[][] = [];

		// Helper function to traverse the graph and collect connected nodes
		const explore = (node: number, links: Link[], island: number[]) => {
			if (visited.has(node)) return;
			visited.add(node);
			island.push(node);

			const neighbors =
				links.find((link) => link.from === node)?.to || [];
			neighbors.forEach((neighbor) => {
				if (!visited.has(neighbor)) {
					explore(neighbor, links, island);
				}
			});
		};

		// Iterate through all nodes in the links array
		links.forEach(({ from }) => {
			if (!visited.has(from)) {
				const island: number[] = [];
				explore(from, links, island);
				islands.push(island);
			}
		});

		// Find nodes in `to` arrays that are not in `from`
		links
			.flatMap((link) => link.to)
			.forEach((node) => {
				if (!visited.has(node)) {
					const island: number[] = [];
					explore(node, links, island);
					islands.push(island);
				}
			});

		return islands;
	};

	const mergeIslands = (geometries: Geometry, islands: number[][]) => {
		// Merge geometries for each island into a single MultiPolygon
		const mergedGeometries: Feature<MultiPolygon>[] = islands.map(
			(island) => {
				// Filter geometries to only include those in current island
				const islandGeometries = geometries.features.filter((feature) =>
					island.includes(feature.properties?.id)
				);

				// Combine all polygons in the island into a single MultiPolygon
				const combinedPolygons = union(
					featureCollection(islandGeometries)
				);

				return combinedPolygons as Feature<MultiPolygon>;
			}
		);

		// Return a FeatureCollection of the merged islands
		return featureCollection(mergedGeometries);
	};

	// New function to handle extraction and graph construction
	const handleParcelsAndGraphConstruction = (
		parcels: Geometry,
		polygon: Feature<Polygon | MultiPolygon, GeoJsonProperties>
	): FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> => {
		const filteredParcels = extractParcelsInsideCircle(parcels, polygon);
		const centroids = extractCentroids(filteredParcels);
		const centroidGraph = constructCentroidGraph(centroids);
		const islands = findIslands(centroidGraph);

		const merged = mergeIslands(
			filteredParcels,
			islands.filter((i) => i.length > 1)
		);

		return merged;
	};

	return (
		<>
			<GeoJsonLayer
				key={index}
				id={`selected-${index}`}
				geometry={handleParcelsAndGraphConstruction(parcelData, buffer)}
				color="white"
				opacity={0.2}
			/>
		</>
	);
};
