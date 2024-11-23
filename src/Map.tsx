import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState } from 'react';
import InteractiveMap, { MapMouseEvent, Marker } from 'react-map-gl';

interface Node {
	longitude: number;
	latitude: number;
}

export const Map: React.FC = () => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);

	const addNode = (event: MapMouseEvent) => {
		if (!isAddingNodes) return;
		const newNode: Node = {
			longitude: event.lngLat.lng,
			latitude: event.lngLat.lat,
		};
		setNodes((prevNodes: Node[]) => [...prevNodes, newNode]);
	};

	const handleAddNode = () => {
		setIsAddingNodes(!isAddingNodes);
	};

	console.log('nodes', nodes);

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
						key={JSON.stringify(node)}
						longitude={node.longitude}
						latitude={node.latitude}
						anchor="bottom"
					/>
				))}
			</InteractiveMap>

			<button
				className={`absolute top-0 z-10 left-0 ml-2 mt-2 ${
					isAddingNodes ? `text-cyan-700` : `text-gray-200`
				}`}
				onClick={handleAddNode}
			>
				Add Nodes
			</button>
		</>
	);
};
