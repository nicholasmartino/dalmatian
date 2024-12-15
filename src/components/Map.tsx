import {
	booleanPointInPolygon,
	centroid,
	circle as turfCircle,
	union as turfUnion,
} from '@turf/turf';
import {
	Feature,
	FeatureCollection,
	GeoJsonProperties,
	MultiPolygon,
	Polygon,
} from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useState } from 'react';
import InteractiveMap, {
	Layer,
	MapMouseEvent,
	Marker,
	MarkerDragEvent,
	Source,
} from 'react-map-gl';
import { Node } from '../types/Node';
import { exportNodesToJson, importNodesFromJson } from '../utils/NodesIO';
import {
	calculateSpatialDispersionIndex,
	calculateTotalDensity,
} from '../utils/SpatialStats';

const newGuid = () => {
	return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
		(
			+c ^
			(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
		).toString(16)
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
			className={`bg-gray-900 bg-opacity-75 absolute z-10 flex-col flex text-left border-cyan-800 border-2 rounded-lg p-4 ${className}`}
		>
			{children}
		</div>
	);
};

type InputProps<T> = {
	label: string;
	value: T;
	setValue: (value: T) => void;
	unit?: string;
};

const Input = <T extends number | string>(props: InputProps<T>) => {
	const { label, value, setValue, unit } = props;
	return (
		<div>
			{label}
			<input
				className="mr-2 ml-2 pl-2 mt-2 rounded-md w-20"
				value={value}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setValue(
						typeof value === 'number'
							? (Number(e.target.value) as T)
							: (e.target.value as T)
					)
				}
			/>
			{unit && <span>{unit}</span>}
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

type MetricProps = {
	label: string;
	value: number;
};

const Metric = (props: MetricProps) => {
	const { label, value } = props;
	return (
		<div className="flex justify-between w-full">
			<div className="mr-2 text-right w-full">{label}</div>
			<b>{value}</b>
		</div>
	);
};

type GeoJsonLayerProps = {
	id: string; // Add key prop
	geometry: Geometry;
	color?: string;
	opacity?: number;
};

/* Render GeoJSON Polygon Layer from file */
const GeoJsonLayer = (props: GeoJsonLayerProps) => {
	const { id: key, geometry, color, opacity } = props;
	return (
		geometry && (
			<Source id={key} type="geojson" data={geometry}>
				<Layer
					id={key}
					type="fill"
					paint={{
						'fill-color': `${color ?? '#ff0000'}`,
						'fill-opacity': opacity ?? 1,
					}}
				/>
			</Source>
		)
	);
};

// Generate GeoJSON circles for all nodes
const generateCircleGeoJSON = (nodes: Node[]): Geometry => {
	if (nodes.length === 0) {
		return {
			type: 'FeatureCollection',
			features: [],
		};
	}

	const featureCollection: Geometry = {
		type: 'FeatureCollection' as const,
		features: nodes.map((node) =>
			turfCircle([node.longitude, node.latitude], node.radius / 1000, {
				steps: 64,
			})
		),
	};
	if (featureCollection.features.length <= 1) return featureCollection;

	return {
		type: 'FeatureCollection',
		features: [turfUnion(featureCollection)],
	} as Geometry;
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

const OutputMetrics: React.FC<{ nodes: Node[] }> = ({ nodes }) => {
	return (
		<Box className="top-2 right-2 text-right" key={JSON.stringify(nodes)}>
			<Metric
				label={'Spatial Dispersion Index'}
				value={calculateSpatialDispersionIndex(nodes)}
			/>
			<Metric
				label={'Total Density'}
				value={calculateTotalDensity(nodes)}
			/>
		</Box>
	);
};

interface Geometry
	extends FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> {}

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
