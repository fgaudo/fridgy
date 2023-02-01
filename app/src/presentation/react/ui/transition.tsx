export const Transition = (props: {
	loading: boolean
	children: JSX.Element[] | JSX.Element
}): JSX.Element => (
	<div className="transition-opacity duration-500 ease-in-out">
		{props.children}
	</div>
)
