import * as React from 'react';
import { useState } from 'react';
import { Button } from './Button';
import { Geometry } from './GeoJSON';

interface BuildingFootprintGeneratorProps {
	parcels: Geometry;
	clusters: Geometry;
	onFootprintsGenerated: (footprints: GeoJSON.FeatureCollection) => void;
}

interface CustomButtonProps {
	disabled?: boolean;
}

export const BuildingFootprintGenerator: React.FC<
	BuildingFootprintGeneratorProps
> = ({ parcels, clusters, onFootprintsGenerated }) => {
	const [loading, setLoading] = useState(false);

	const generateFootprints = async () => {
		setLoading(true);
		// Implementation of generateFootprints function
		setLoading(false);
	};

	return (
		<Button
			onClick={
				loading ||
				!parcels.features ||
				!clusters.features ||
				clusters.features.length === 0
					? () => {}
					: generateFootprints
			}
		>
			{loading ? 'Generating...' : 'Generate Footprints'}
		</Button>
	);
};
