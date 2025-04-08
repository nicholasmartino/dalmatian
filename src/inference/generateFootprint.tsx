import * as tf from '@tensorflow/tfjs';

export async function generateFootprint(
	inputImage: HTMLImageElement,
	imageSize: [number, number],
	model: tf.LayersModel
): Promise<tf.Tensor | null> {
	try {
		// Preprocess the image
		const tensor = preprocessImage(inputImage, imageSize);

		// Generate the footprint
		const prediction = model.predict(tensor) as tf.Tensor;

		// Clean up input tensor to avoid memory leaks
		tensor.dispose();

		// Postprocess the output
		return postprocessOutput(prediction);
	} catch (error) {
		console.error('Error generating footprint:', error);
		return null;
	}
}

function preprocessImage(
	image: HTMLImageElement,
	size: [number, number]
): tf.Tensor {
	return tf.tidy(() => {
		return tf.browser
			.fromPixels(image)
			.resizeBilinear(size)
			.toFloat()
			.div(255.0)
			.expandDims(0);
	});
}

function postprocessOutput(output: tf.Tensor): tf.Tensor {
	return tf.tidy(() => {
		return output.squeeze().mul(255).clipByValue(0, 255).cast('int32');
	});
}
