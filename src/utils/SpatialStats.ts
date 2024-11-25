import * as turf from '@turf/turf';
import { Node } from '../types/Node';

// Weighted mean center
const weightedMeanCenter = (nodes: Node[]) => {
	const totalDensity = nodes.reduce(
		(sum, node) => sum + (node.density ?? 1),
		0
	);
	const weightedCoords = nodes.reduce(
		(acc, node) => {
			const weightedPoint = [
				node.longitude * (node.density ?? 1),
				node.latitude * (node.density ?? 1),
			];
			return [acc[0] + weightedPoint[0], acc[1] + weightedPoint[1]];
		},
		[0, 0]
	);

	return {
		x: weightedCoords[0] / totalDensity,
		y: weightedCoords[1] / totalDensity,
	};
};

// Spatial Dispersion Index
export const spatialDispersionIndex = (nodes: Node[]): number => {
	if (nodes.length === 0) return 0;

	const totalDensity = nodes.reduce(
		(sum, node) => sum + (node.density ?? 1),
		0
	);
	const center = weightedMeanCenter(nodes);

	const variance = nodes.reduce((sum, node) => {
		const from = turf.point([node.longitude, node.latitude]);
		const to = turf.point([center.x, center.y]);
		const distance = turf.distance(from, to, { units: 'kilometers' });
		return sum + (node.density ?? 1) * distance ** 2;
	}, 0);

	return Math.sqrt(variance / totalDensity);
};
