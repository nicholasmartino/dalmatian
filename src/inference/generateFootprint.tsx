import * as tf from '@tensorflow/tfjs';

export async function generateFootprint(
	inputImage: HTMLImageElement
): Promise<tf.Tensor> {
	// Load the model
	const model = await tf.loadLayersModel('/Users/nicholasmartino/Repositories/pugmark/data/model/model.json');

	// Preprocess the image
	const tensor = tf.browser
		.fromPixels(inputImage)
		.resizeBilinear([256, 256])
		.toFloat()
		.div(255.0)
		.expandDims(0);

	// Generate the footprint
	const output = model.predict(tensor)

	// Postprocess (convert back to image format)
	const outputImage = (output as tf.Tensor)
		?.squeeze()
		?.mul(255)
		?.clipByValue(0, 255)
		?.cast('int32');

	return outputImage;
}
