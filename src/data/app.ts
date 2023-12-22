import { App } from '@/application/app'

import { deleteFoodsByIds } from './commands/delete-foods-by-ids'
import { foods } from './commands/foods'
import { log } from './commands/log'

export async function createApp(): Promise<App> {
	return Promise.resolve(
		new App({
			deleteFoodsByIds: ids => deleteFoodsByIds(ids)(undefined),
			foods: foods(undefined),
			appLog: (type, message) => log(type, message)(undefined),
			uiLog: (type, message) => log(type, message)(undefined)
		})
	)
}
