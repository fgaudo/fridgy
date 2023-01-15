import { createContext, render } from 'preact'
import { useContext } from 'preact/hooks'
import { UseCases } from '../application'
import { FoodsPage } from './pages/main'
import * as OE from 'fp-ts-rxjs/ObservableEither'

interface Config {
  useCases: UseCases
}

export const GlobalContext = createContext<Config>({
  useCases: {
    getFoodsPage: OE.of({ foods: [] })
  }
})

export const useGlobalContext: () => Config = () => useContext(GlobalContext)

export function renderApp (element: Element, config: Config): void {
  render(
    <GlobalContext.Provider value={config}>
      <FoodsPage />
    </GlobalContext.Provider>,
    element
  )
}
