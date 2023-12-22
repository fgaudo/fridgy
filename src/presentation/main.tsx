import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '@/application/app'

import AppUI from './App'
import './index.css'

export function render(app: App): void {
	const root = document.getElementById('root')

	if (!root) {
		throw new Error('No #root in html')
	}

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<AppUI />
		</React.StrictMode>
	)
}
