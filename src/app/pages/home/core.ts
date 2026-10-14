export * as Model from './core/model.ts'
export * as State from './core/state.ts'
export * as Update from './core/update.ts'
export * as Msg from './core/messages.ts'

import * as Home from '@/app/pages/home/core.ts'
import * as About from '@/app/pages/about/core.ts'

export const Pages = { Home, About }
export type Pages = typeof Pages
