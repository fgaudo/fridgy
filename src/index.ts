import { flip } from 'fp-ts/lib/function'

import { Controller } from '@/core/controller'

import { app } from '@/app'

import { appUseCases } from '@/data'

import { render } from '@/ui'

try {
	const controller = new Controller(
		flip(app(appUseCases)),
	)

	render(controller)
} catch (error) {
	console.error(error)
}
