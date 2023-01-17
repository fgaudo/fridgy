import { UseCases } from '@/application'
import { FoodsPage } from '@/presentation/preact/pages/main'
import { createContext, render } from 'preact'
import { useContext } from 'preact/hooks'
import { Route, Router } from 'preact-router'
import { AddFoodPage } from './pages/add-food'
import { createHashHistory } from 'history'

interface Config {
  readonly useCases: UseCases
}

export const GlobalContext = createContext<Config>(null as any)
export const useGlobalContext: () => Config = () => useContext(GlobalContext)

export function renderApp (element: Element, config: Config): void {
  render(
    <GlobalContext.Provider value={config}>
      <Router history={createHashHistory()}>
        <Route path='/add-food' component={AddFoodPage} />
        <Route path='/' component={FoodsPage} />
      </Router>
    </GlobalContext.Provider>,
    element
  )
}
