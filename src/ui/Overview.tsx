import {
	Avatar,
	Card,
	List,
	ListItem,
	ListItemPrefix,
	Typography,
} from '@material-tailwind/react'
import { useObservableState } from 'observable-hooks'
import { useContext } from 'react'

import { AppContext } from './context'

function Overview() {
	const overview =
		useContext(AppContext)!.overview

	const model = useObservableState(
		overview.stream,
		overview.init,
	)

	if (model.type === 'loading') {
		return <div>Loading</div>
	}

	return (
		<Card className="w-96">
			<List>
				{model.foods.map(food => (
					<ListItem key={food.id}>
						<ListItemPrefix>
							<Avatar
								variant="circular"
								alt="candice"
								src="https://docs.material-tailwind.com/img/face-1.jpg"
							/>
						</ListItemPrefix>
						<div>
							<Typography
								variant="h6"
								color="blue-gray">
								Tania Andrew
							</Typography>
							<Typography
								variant="small"
								color="gray"
								className="font-normal">
								Software Engineer @ Material
								Tailwind
							</Typography>
						</div>
					</ListItem>
				))}
			</List>
		</Card>
	)
}

export default Overview
