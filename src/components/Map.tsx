import { circle as turfCircle, union as turfUnion } from '@turf/turf';
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

const NodeBuffers: React.FC<{ nodes: Node[] }> = ({ nodes }) => {
	// Generate GeoJSON circles for all nodes
	const generateCircleGeoJSON = () => {
		if (nodes.length === 0) {
			return {
				type: 'FeatureCollection',
				features: [],
			};
		}

		const featureCollection = {
			type: 'FeatureCollection' as const,
			features: nodes.map((node) =>
				turfCircle(
					[node.longitude, node.latitude],
					node.radius / 1000,
					{
						steps: 64,
					}
				)
			),
		};
		if (featureCollection.features.length <= 1) return featureCollection;

		return {
			type: 'FeatureCollection',
			features: [turfUnion(featureCollection)],
		};
	};

	return (
		<Source id="node-circles" type="geojson" data={generateCircleGeoJSON()}>
			<Layer
				id="circle-layer"
				type="fill"
				paint={{
					'fill-color': '#007cbf',
					'fill-opacity': 0.3,
				}}
			/>
			<Layer
				id="circle-outline-layer"
				type="line"
				paint={{
					'line-color': '#007cbf',
					'line-width': 2,
				}}
			/>
		</Source>
	);
};

/* Render GeoJSON Polygon Layer from file */
const Parcels: React.FC<{ data: any }> = ({ data }) => {
	return (
		data && (
			<Source id="geojson-source" type="geojson" data={data}>
				<Layer
					id="geojson-layer"
					type="fill"
					paint={{
						'fill-color': '#ff0000',
						'fill-opacity': 0.2,
					}}
				/>
			</Source>
		)
	);
};

export const Map: React.FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);
	const [isRemovingNodes, setIsRemovingNodes] = useState<boolean>(false);
	const [radius, setRadius] = useState<number>(1600);
	const [geoJsonData, setGeoJsonData] = useState<any>(null);

	useEffect(() => {
		// Fetch GeoJSON from the public/data folder
		fetch('./data/Parcel.geojson')
			.then((response) => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then((data) => {
				setGeoJsonData(data);
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

				<NodeBuffers nodes={nodes} />
				<Parcels data={geoJsonData} />
			</InteractiveMap>

			{/* Control UI */}
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
				<Input
					label="Radius"
					value={radius}
					setValue={setNodeRadii}
					unit="m"
				/>
			</Box>

			{/* Metrics UI */}
			<Box
				className="top-2 right-2 text-right"
				key={JSON.stringify(nodes)}
			>
				<Metric
					label={'Spatial Dispersion Index'}
					value={calculateSpatialDispersionIndex(nodes)}
				/>
				<Metric
					label={'Total Density'}
					value={calculateTotalDensity(nodes)}
				/>
			</Box>
		</>
	);
};
