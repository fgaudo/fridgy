import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '@/app/app'

import Overview from '@/ui/Overview'

import { AppContext } from './context'
import './index.css'

export function render(app: App): void {
	const root = document.getElementById('root')

	if (!root) {
		throw new Error('No #root in html')
	}

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<AppContext.Provider value={app}>
				<Overview />
			</AppContext.Provider>
		</React.StrictMode>,
	)
}
