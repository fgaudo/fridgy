import { DeleteFoodsByIds } from './commands/delete-foods-by-ids'
import { Foods } from './commands/foods'
import { Log } from './commands/log'
import { OverviewController, overview } from './controllers/overview'

export class App {
	constructor({
		deleteFoodsByIds,
		foods,
		uiLog,
		appLog
	}: Readonly<{
		deleteFoodsByIds: DeleteFoodsByIds
		foods: Foods
		uiLog: Log
		appLog: Log
	}>) {
		this.overview = overview({ deleteFoodsByIds, foods, log: appLog })
		this.log = uiLog
	}

	readonly overview: OverviewController
	readonly log: Log
}
