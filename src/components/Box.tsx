type BoxProps = {
	children: React.ReactNode;
	className?: string;
};

export const Box = (props: BoxProps) => {
	const { children, className } = props;
	return (
		<div
			className={`bg-gray-900 bg-opacity-75 absolute z-10 flex-col flex text-left rounded-lg p-4 ${className}`}
		>
			{children}
		</div>
	);
};
