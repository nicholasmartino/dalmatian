import mapboxgl from 'mapbox-gl';
import React, { useEffect, useRef, useState } from 'react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Node {
	coordinates: [number, number];
}

const Map: React.FC = () => {
	const mapContainer = useRef<HTMLDivElement | null>(null);
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);

	useEffect(() => {
		const map = new mapboxgl.Map({
			container: mapContainer.current!,
			style: 'mapbox://styles/mapbox/dark-v11',
			center: [-123.1216, 49.2827], // Initial center set to Vancouver, BC
			zoom: 11, // Adjust zoom level as needed
		});

		map.on('load', () => {});

		return () => map.remove(); // Cleanup on unmount
	}, []);

	const addNode = (coordinates: [number, number]) => {
		const newNode: Node = { coordinates };
		setNodes((prevNodes) => [...prevNodes, newNode]);
	};

	const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
		const coordinates: [number, number] = [
			event.lngLat.lng,
			event.lngLat.lat,
		] as [number, number];
		addNode(coordinates); // Add node at clicked location
	};

	const handleAddNode = () => {
		setIsAddingNodes(!isAddingNodes);
	};

	return (
		<div className="w-full">
			<div
				style={{ width: '100vw', height: '90vh' }}
				ref={mapContainer}
				onClick={handleMapClick}
			/>
			<button onClick={handleAddNode}>Add Nodes</button>
		</div>
	);
};

export default Map;
