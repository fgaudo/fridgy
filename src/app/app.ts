import { DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'
import { OnFoods } from '@/app/commands/foods'
import { Log } from '@/app/commands/log'
import { OverviewController, overview } from '@/app/controllers/overview'

type AppParams = Readonly<{
	deleteFoodsByIds: DeleteFoodsByIds
	foods: OnFoods
	uiLog: Log
	appLog: Log
}>

export class App {
	constructor({ deleteFoodsByIds, foods, uiLog, appLog }: AppParams) {
		this.overview = overview({ deleteFoodsByIds, food$: foods, log: appLog })
		this.log = uiLog
	}

	readonly overview: OverviewController
	readonly log: Log
}
