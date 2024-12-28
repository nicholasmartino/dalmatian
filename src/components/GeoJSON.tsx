import { circle as turfCircle, union as turfUnion } from '@turf/turf';
import {
	FeatureCollection,
	GeoJsonProperties,
	MultiPolygon,
	Polygon,
} from 'geojson';
import { DataDrivenPropertyValueSpecification } from 'mapbox-gl';
import { Layer, Source } from 'react-map-gl';
import { Node } from '../types/Node';

export interface Geometry
	extends FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> {}

type GeoJsonLayerProps = {
	id: string;
	geometry: Geometry;
	color?: string | DataDrivenPropertyValueSpecification<string>;
	opacity?: number;
	strokeColor?: string;
	strokeWidth?: number;
};

/* Render GeoJSON Polygon Layer from file */
export const GeoJsonLayer = (props: GeoJsonLayerProps) => {
	const { id, geometry, color, opacity, strokeColor, strokeWidth } = props;
	return (
		geometry && (
			<Source id={id} type="geojson" data={geometry}>
				<Layer
					id={`${id}-outline`}
					type="line"
					paint={{
						'line-color': strokeColor ?? '#ff0000',
						'line-width': strokeWidth ?? (strokeColor ? 1 : 0),
					}}
				/>
				<Layer
					id={`${id}-fill`}
					type="fill"
					paint={{
						'fill-color': color ?? '#ff0000',
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
