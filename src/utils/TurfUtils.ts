import { buffer, point } from '@turf/turf';

export const calculateBuffer = (
	longitude: number,
	latitude: number,
	radius: number
) => {
	const center = point([longitude, latitude]); // San Francisco
	const buffered = buffer(center, radius, { units: 'meters' });
	return buffered;
};
