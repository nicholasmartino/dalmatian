import { Node } from '../types/Node';
import {
	calculateSpatialDispersionIndex,
	calculateTotalDensity,
} from '../utils/SpatialStats';
import { Box } from './Box';

type MetricProps = {
	label: string;
	value: number;
};

const Metric = (props: MetricProps) => {
	const { label, value } = props;
	return (
		<div className="flex justify-between w-full">
			<div className="mr-2 text-right w-full">{label}</div>
			<b>{value}</b>
		</div>
	);
};

export const OutputMetrics: React.FC<{ nodes: Node[] }> = ({ nodes }) => {
	return (
		<Box className="top-2 right-2 text-right" key={JSON.stringify(nodes)}>
			<Metric
				label={'Spatial Dispersion Index'}
				value={calculateSpatialDispersionIndex(nodes)}
			/>
			<Metric
				label={'Total Density'}
				value={calculateTotalDensity(nodes)}
			/>
		</Box>
	);
};
