export const AddFab = (props: {
	onClick: () => void
	label: string
}): JSX.Element => (
	<button
		onClick={props.onClick}
		type="button"
		className="fixed right-7 bottom-12 z-10 inline-flex items-center rounded-full bg-primary p-3 text-center text-lg font-medium text-white focus:outline-none focus:ring-4">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className="h-6 w-6">
			<path
				fillRule="evenodd"
				d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
				clipRule="evenodd"
			/>
		</svg>
		<span className="sr-only">{props.label}</span>
	</button>
)
