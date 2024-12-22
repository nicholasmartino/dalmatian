import {
	booleanPointInPolygon,
	centroid,
	featureCollection,
	union,
} from '@turf/turf';
import { Feature, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
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

	console.time(`Buffer ${index}`);

	console.time('Graph');
	const filteredParcels = extractParcelsInsideCircle(geometry, boundary);
	const centroids = extractCentroids(filteredParcels);
	const centroidGraph = constructCentroidGraph(centroids);
	console.timeEnd('Graph');

	console.time('Find Islands');
	const islands = findIslands(centroidGraph);
	console.timeEnd('Find Islands');

	console.time('Merge Islands');
	const merged = mergeIslands(
		filteredParcels,
		islands.filter((i) => i.length > 1)
	);
	console.timeEnd('Merge Islands');

	console.timeEnd(`Buffer ${index}`);

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
