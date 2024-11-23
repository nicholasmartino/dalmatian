import mapboxgl, { Marker } from 'mapbox-gl';
import React, { useEffect, useRef, useState } from 'react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Node {
	coordinates: [number, number];
}

export const Map: React.FC = () => {
	const mapContainer = useRef<HTMLDivElement | null>(null);
	const [nodes, setNodes] = useState<Node[]>([]);
	const [isAddingNodes, setIsAddingNodes] = useState<boolean>(false);
	const mapRef = useRef<mapboxgl.Map | null>(null);

	useEffect(() => {
		const map = new mapboxgl.Map({
			container: mapContainer.current!,
			style: 'mapbox://styles/mapbox/dark-v11',
			center: [-123.1216, 49.2827],
			zoom: 11,
		});
		mapRef.current = map;

		map.on('load', () => {
			nodes.forEach((node) => {
				new Marker().setLngLat(node.coordinates).addTo(map);
			});
		});

		map.on('click', (event) => {
			const coordinates: [number, number] = [
				event.lngLat.lng,
				event.lngLat.lat,
			] as [number, number];
			addNode(coordinates);
		});

		return () => map.remove();
	}, [nodes]);

	const addNode = (coordinates: [number, number]) => {
		const newNode: Node = { coordinates };
		setNodes((prevNodes) => {
			const updatedNodes = [...prevNodes, newNode];
			new Marker().setLngLat(coordinates).addTo(mapRef.current!);
			return updatedNodes;
		});
	};

	const handleAddNode = () => {
		setIsAddingNodes(!isAddingNodes);
	};

	return (
		<div className="w-full">
			<div
				style={{ width: '100vw', height: '90vh' }}
				ref={mapContainer}
			/>
			<button onClick={handleAddNode}>Add Nodes</button>
		</div>
	);
};
