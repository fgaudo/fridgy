export const Title = (props: { text: string }): JSX.Element => (
	<div className="fixed z-10 w-full bg-gray-100 flex items-center p-3 text-2xl font-bold h-14">
		{props.text}
	</div>
)
