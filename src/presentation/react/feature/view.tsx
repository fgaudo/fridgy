import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import {
	Button,
	Checkbox,
	IconButton,
	Input,
	Navbar,
	Typography
} from '@material-tailwind/react'

import { useGlobalContext } from '@/presentation/react/feature/app'

export function FoodView(): JSX.Element {
	const { title } = useGlobalContext()

	return (
		<>
			<Navbar className="sticky mx-auto max-w-screen-xl rounded-none bg-blue-900 px-4 py-5 lg:px-8 lg:py-4">
				<div className="container flex items-center gap-4 text-white">
					<IconButton
						variant="text"
						className="h-6 w-6 text-inherit hover:bg-transparent focus:bg-transparent active:bg-transparent lg:hidden"
						ripple={false}
					>
						<ArrowLeftIcon className="h-6 w-6 font-bold" />
					</IconButton>
					<Typography variant="h5">Add Food</Typography>
				</div>
			</Navbar>
			<div className="px-3 py-5">
				<div className="p-3 sm:col-span-3">
					<Input
						variant="static"
						label="Name"
						crossOrigin="anonymous"
					/>
				</div>

				<div className="p-3 sm:col-span-3">
					<Input
						variant="static"
						label="Quantity"
						crossOrigin="anonymous"
						type="number"
					/>
				</div>

				<div className="p-3 sm:col-span-3">
					<Input
						variant="static"
						label="Expiration Date"
						crossOrigin="anonymous"
						type="date"
					/>
					<Checkbox
						label="best before"
						defaultChecked
						crossOrigin="anonymous"
					/>
				</div>
				<div className="flex p-3 sm:col-span-3">
					<Button className="flex-1">Add</Button>
				</div>
			</div>
		</>
	)
}
