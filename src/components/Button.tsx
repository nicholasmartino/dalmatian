type ButtonProps = {
	onClick: () => void;
	children: React.ReactNode;
	className?: string;
};

export const Button = (props: ButtonProps) => {
	const { onClick, children, className } = props;
	return (
		<button
			onClick={onClick}
			className={`text-left w-full hover:text-cyan-600 ${className}`}
		>
			{children}
		</button>
	);
};
