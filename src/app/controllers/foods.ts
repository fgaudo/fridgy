import { Controller } from "@/core/controller"

type Command = {type: 'enqueueDeleteFoodsByIds', ids: ReadonlySet<string>}

export const foods: Controller<Command, FoodsModel> =  new Controller((command$) => )
