export const Transition = (props: {
	loading: boolean
	children: JSX.Element[] | JSX.Element
}): JSX.Element => (
	<div
		className={classNames(
			'transition-opacity duration-500 ease-in-out',
			props.loading ? 'opacity-60' : 'opacity-100'
		)}>
		{props.children}
	</div>
)
