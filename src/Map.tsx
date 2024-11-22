// src/components/Map.tsx
import mapboxgl, { Marker } from "mapbox-gl";
import React, { useEffect, useRef, useState } from "react";

mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN";

interface Node {
  id: string;
  coordinates: [number, number];
}

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0], // Initial center
      zoom: 2,
    });

    map.on("load", () => {
      loadNodes(); // Load nodes from JSON
    });

    return () => map.remove(); // Cleanup on unmount
  }, []);

  const loadNodes = async () => {
    const response = await fetch("path/to/nodes.json");
    const data = await response.json();
    setNodes(data.nodes); // Assuming the JSON structure has a 'nodes' array
    renderNodes(data.nodes);
  };

  const renderNodes = (nodes: Node[]) => {
    nodes.forEach((node) => {
      const marker = new Marker({ draggable: true })
        .setLngLat(node.coordinates)
        .addTo(mapboxgl.Map);

      marker.on("dragend", (e) => onNodeDragEnd(e, node.id));
    });
  };

  const onNodeDragEnd = (event: mapboxgl.MarkerDragEvent, nodeId: string) => {
    const lngLat = event.target.getLngLat();
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? { ...node, coordinates: [lngLat.lng, lngLat.lat] }
          : node
      )
    );
  };

  const addNode = (coordinates: [number, number]) => {
    const newNode: Node = { id: generateId(), coordinates };
    setNodes((prevNodes) => [...prevNodes, newNode]);
    renderNodes([newNode]); // Render the new node
  };

  const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9); // Simple ID generator
  };

  const removeNode = (nodeId: string) => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));
    // Optionally, re-render nodes if needed
  };

  return (
    <div>
      <div ref={mapContainer} style={{ width: "100%", height: "500px" }} />
      {/* Add buttons or UI elements for adding/removing nodes */}
    </div>
  );
};

export default Map;
