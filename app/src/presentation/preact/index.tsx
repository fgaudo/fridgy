import { UseCases } from '@/application'
import { FoodsPage } from '@/presentation/preact/pages/main'
import { createContext, render } from 'preact'
import { useContext } from 'preact/hooks'

interface Config {
  readonly useCases: UseCases
}

export const GlobalContext = createContext<Config>(null as any)
export const useGlobalContext: () => Config = () => useContext(GlobalContext)

export function renderApp (element: Element, config: Config): void {
  render(
    <GlobalContext.Provider value={config}>
      <FoodsPage />
    </GlobalContext.Provider>,
    element
  )
}
