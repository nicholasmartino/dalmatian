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
import { GeoJsonLayer, Geometry } from './GeoJSON';

type ClusterProps = {
	index: number;
	geometry: Geometry;
	boundary: Feature<Polygon | MultiPolygon, GeoJsonProperties>;
};

export const Cluster = (props: ClusterProps) => {
	const { index, geometry, boundary } = props;

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

	// Extract centroids from parcels
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

	// Find nearest centroids and construct a graph
	const constructCentroidGraph = (
		centroids: Centroid[],
		minNeighbors: number = 2,
		maxRadius: number = 10
	): Link[] => {
		const spatialIndex = new KDBush(centroids.length);
		centroids.forEach((c) => spatialIndex.add(c.coords[0], c.coords[1]));
		spatialIndex.finish();

		return centroids.map((centroid) => {
			const nearestIds = around<number>(
				spatialIndex,
				centroid.coords[0],
				centroid.coords[1],
				minNeighbors,
				maxRadius
			);
			return {
				from: centroid.id,
				to: nearestIds.map((i) => centroids[i].id),
			};
		});
	};

	const findIslands = (links: Link[]): number[][] => {
		// Step 1: Build the adjacency list
		const adjacencyList = new Map<number, Set<number>>();

		links.forEach(({ from, to }) => {
			if (!adjacencyList.has(from)) {
				adjacencyList.set(from, new Set());
			}
			to.forEach((neighbor) => {
				adjacencyList.get(from)?.add(neighbor);
				if (!adjacencyList.has(neighbor)) {
					adjacencyList.set(neighbor, new Set());
				}
				adjacencyList.get(neighbor)?.add(from); // Ensure bidirectional edges
			});
		});

		// Step 2: Traverse the graph using DFS
		const visited = new Set<number>();
		const islands: number[][] = [];

		const explore = (node: number, island: number[]) => {
			if (visited.has(node)) return;
			visited.add(node);
			island.push(node);

			(adjacencyList.get(node) || []).forEach((neighbor) => {
				if (!visited.has(neighbor)) {
					explore(neighbor, island);
				}
			});
		};

		// Step 3: Discover all islands
		adjacencyList.forEach((_neighbors, node) => {
			if (!visited.has(node)) {
				const island: number[] = [];
				explore(node, island);
				islands.push(island);
			}
		});

		return islands;
	};

	const mergeIslands = (
		geometries: Geometry,
		islands: number[][]
	): FeatureCollection<MultiPolygon, GeoJsonProperties> => {
		const idToFeatureMap = new Map<number, Feature<Polygon | MultiPolygon>>(
			geometries.features.map((feature) => [
				feature.properties?.id,
				feature as Feature<Polygon | MultiPolygon>,
			])
		);

		const mergedGeometries: Feature<MultiPolygon>[] = islands.map(
			(island) => {
				const islandGeometries = island
					.map((id) => idToFeatureMap.get(id))
					.filter(
						(feature): feature is Feature<Polygon | MultiPolygon> =>
							Boolean(feature)
					);

				const combinedPolygons = union(
					featureCollection(islandGeometries)
				);

				return combinedPolygons as Feature<MultiPolygon>;
			}
		);

		return featureCollection(mergedGeometries);
	};

	console.time('Buffer');

	console.time('Extract Parcels');
	const filteredParcels = extractParcelsInsideCircle(geometry, boundary);
	console.timeEnd('Extract Parcels');

	console.time('Extract Centroids');
	const centroids = extractCentroids(filteredParcels);
	console.timeEnd('Extract Centroids');

	console.time('Construct Graph');
	const centroidGraph = constructCentroidGraph(centroids);
	console.timeEnd('Construct Graph');

	console.time('Find Islands');
	const islands = findIslands(centroidGraph);
	console.timeEnd('Find Islands');

	console.time('Merge Islands');
	const merged = mergeIslands(
		filteredParcels,
		islands.filter((i) => i.length > 1)
	);
	console.timeEnd('Merge Islands');

	console.timeEnd('Buffer');
	console.log('---');

	return (
		<>
			<GeoJsonLayer
				key={`selected-${index}`}
				id={`selected-${index}`}
				geometry={filteredParcels}
				color="white"
				opacity={0.2}
			/>
			<GeoJsonLayer
				key={`merged-${index}`}
				id={`merged-${index}`}
				geometry={merged}
				color="red"
				opacity={0.2}
			/>
		</>
	);
};
