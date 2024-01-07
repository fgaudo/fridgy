import * as React from 'react'
import * as ReactDOM from 'react-dom/client'

import { Controller } from '@/core/controller'

import {
	Command as AppCommand,
	Model as AppModel,
} from '@/app'

import Overview from '@/ui/Overview'

import { AppContext } from './context'
import './index.css'

export function render(
	appController: Controller<AppCommand, AppModel>,
): void {
	const root = document.getElementById('root')

	if (!root) {
		throw new Error('No #root in html')
	}

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<AppContext.Provider value={appController}>
				<Overview />
			</AppContext.Provider>
		</React.StrictMode>,
	)
}
