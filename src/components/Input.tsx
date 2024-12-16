type InputProps<T> = {
	label: string;
	value: T;
	setValue: (value: T) => void;
	unit?: string;
};

export const Input = <T extends number | string>(props: InputProps<T>) => {
	const { label, value, setValue, unit } = props;
	return (
		<div>
			{label}
			<input
				className="mr-2 ml-2 pl-2 mt-2 rounded-md w-20"
				value={value}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setValue(
						typeof value === 'number'
							? (Number(e.target.value) as T)
							: (e.target.value as T)
					)
				}
			/>
			{unit && <span>{unit}</span>}
		</div>
	);
};
