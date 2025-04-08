import * as tf from '@tensorflow/tfjs';
import * as React from 'react';
import { useState } from 'react';
import { generateFootprint } from '../inference/generateFootprint';
import { Button } from './Button';
import { Geometry } from './GeoJSON';

interface BuildingFootprintGeneratorProps {
	parcels: Geometry;
	clusters: Geometry;
	onFootprintsGenerated: (footprints: GeoJSON.FeatureCollection) => void;
	modelPath: string;
}

// Helper function to render GeoJSON to canvas
const renderGeoJSONToCanvas = (
	ctx: CanvasRenderingContext2D,
	cluster: GeoJSON.Feature,
	parcels: Geometry
) => {
	// Clear canvas
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	// Draw parcels and clusters on canvas
	// Implementation would depend on your specific requirements
	// This is a placeholder for the actual rendering logic
};

// Convert canvas to HTMLImageElement for model input
const canvasToImage = (
	canvas: HTMLCanvasElement
): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = canvas.toDataURL('image/png');
	});
};

// Convert tensor output to GeoJSON feature
const tensorToGeoJSONFeature = (
	tensor: any,
	sourceCluster: GeoJSON.Feature
): GeoJSON.Feature => {
	// Convert tensor data to GeoJSON coordinates
	// This is a placeholder - implementation would depend on
	// how your model outputs data and how you want to represent it
	return {
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			], // Placeholder
		},
		properties: {},
	};
};

export const BuildingFootprintGenerator: React.FC<
	BuildingFootprintGeneratorProps
> = ({ parcels, clusters, onFootprintsGenerated, modelPath }) => {
	const [loading, setLoading] = useState(false);

	const generateFootprints = async () => {
		console.log('Generating footprints...');

		// Create a canvas element to render map data
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const context = canvas.getContext('2d');

		// Load the model from the public directory instead of absolute path
		const model = await tf.loadLayersModel(modelPath);
		if (!model) {
			throw new Error('Failed to load model');
		}

		if (!context) {
			throw new Error('Failed to get canvas context');
		}

		// Process each cluster
		const footprintFeatures: GeoJSON.Feature[] = [];

		for (const cluster of clusters.features) {
			// Render cluster and parcels to canvas
			// This is a simplified version - you'd need to implement proper
			// geospatial rendering to canvas based on your app's needs
			renderGeoJSONToCanvas(context, cluster, parcels);

			// Convert canvas to image
			const image = await canvasToImage(canvas);

			// Generate footprint using ML model
			const footprintTensor = await generateFootprint(
				image,
				[256, 256],
				model
			);
			if (!footprintTensor) continue;

			// Convert tensor to GeoJSON feature
			const feature = tensorToGeoJSONFeature(footprintTensor, cluster);
			footprintFeatures.push(feature);
		}

		// Create GeoJSON feature collection from all generated footprints
		const footprintCollection: GeoJSON.FeatureCollection = {
			type: 'FeatureCollection',
			features: footprintFeatures,
		};

		// Pass the results back to parent component
		onFootprintsGenerated(footprintCollection);
	};

	const handleGenerateFootprints = async () => {
		setLoading(true);
		try {
			await generateFootprints();
		} catch (error) {
			console.error('Error generating footprints:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			onClick={
				!parcels.features ||
				!clusters.features ||
				clusters.features.length === 0
					? () => {}
					: handleGenerateFootprints
			}
		>
			{loading ? 'Generating...' : 'Generate Footprints'}
		</Button>
	);
};
