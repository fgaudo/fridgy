export const Title = (props: { text: string }): JSX.Element => (
	<div className="fixed z-10 flex h-14 w-full items-center bg-gray-100 p-3 text-2xl font-bold">
		{props.text}
	</div>
)
