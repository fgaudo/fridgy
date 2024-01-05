import { App } from '@/app/app'
import { deleteFoodsByIds } from '@/data/commands/delete-foods-by-ids'
import { foods } from '@/data/commands/foods'
import { log } from '@/data/commands/log'

export function createApp(): Promise<App> {
	return Promise.resolve(
		new App({
			deleteFoodsByIds: ids => deleteFoodsByIds(ids)(undefined),
			foods: foods(undefined),
			appLog: (type, message) => log(type, message)(undefined),
			uiLog: (type, message) => log(type, message)(undefined),
		}),
	)
}
