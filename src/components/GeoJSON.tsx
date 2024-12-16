import { circle as turfCircle, union as turfUnion } from '@turf/turf';
import {
	FeatureCollection,
	GeoJsonProperties,
	MultiPolygon,
	Polygon,
} from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Layer, Source } from 'react-map-gl';
import { Node } from '../types/Node';

export interface Geometry
	extends FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> {}

type GeoJsonLayerProps = {
	id: string; // Add key prop
	geometry: Geometry;
	color?: string;
	opacity?: number;
};

/* Render GeoJSON Polygon Layer from file */
export const GeoJsonLayer = (props: GeoJsonLayerProps) => {
	const { id: key, geometry, color, opacity } = props;
	return (
		geometry && (
			<Source id={key} type="geojson" data={geometry}>
				<Layer
					id={key}
					type="fill"
					paint={{
						'fill-color': `${color ?? '#ff0000'}`,
						'fill-opacity': opacity ?? 1,
					}}
				/>
			</Source>
		)
	);
};

// Generate GeoJSON circles for all nodes
export const generateCircleGeoJSON = (nodes: Node[]): Geometry => {
	if (nodes.length === 0) {
		return {
			type: 'FeatureCollection',
			features: [],
		};
	}

	const featureCollection: Geometry = {
		type: 'FeatureCollection' as const,
		features: nodes.map((node) =>
			turfCircle([node.longitude, node.latitude], node.radius / 1000, {
				steps: 64,
			})
		),
	};
	if (featureCollection.features.length <= 1) return featureCollection;

	return {
		type: 'FeatureCollection',
		features: [turfUnion(featureCollection)],
	} as Geometry;
};
