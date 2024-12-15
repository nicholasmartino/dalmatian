import { circle as turfCircle, union as turfUnion } from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState } from 'react';
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
			className={`absolute z-10 flex-col flex text-left border-cyan-800 border-2 rounded-lg p-4 ${className}`}
		>
			{children}
		</div>
	);
};

type InputProps<T> = {
	value: T;
	setValue: (value: T) => void;
	unit?: string;
};

const Input = <T extends number | string>(props: InputProps<T>) => {
	const { value, setValue, unit } = props;
	return (
		<div>
			<input
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

export const Map: React.FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);
	const [isRemovingNodes, setIsRemovingNodes] = useState<boolean>(false);
	const [radius, setRadius] = useState<number>(1600);

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

	// Generate GeoJSON circles for all nodes
	const generateCircleGeoJSON = () => {
		if (nodes.length === 0) {
			return {
				type: 'FeatureCollection',
				features: [],
			};
		}

		const mergedFeatures = nodes.map((node) =>
			turfCircle([node.longitude, node.latitude], radius / 1000, {
				steps: 64,
			})
		);

		const featureCollection = {
			type: 'FeatureCollection' as const,
			features: mergedFeatures,
		};

		const mergedGeometry = turfUnion(featureCollection);

		return {
			type: 'FeatureCollection',
			features: [mergedGeometry],
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

				{/* Render Circles */}
				<Source
					id="node-circles"
					type="geojson"
					data={generateCircleGeoJSON()}
				>
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
			</InteractiveMap>

			{/* Control UI */}
			<Box className="top-2 left-2">
				<Input<number> value={radius} setValue={setRadius} unit="m" />
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
