import * as Effect from 'effect/Effect'

import type { Model } from '@/app/core/home/model.ts'
export const makeView = Effect.gen(function* () {
	return (model: Model) => {
		return (
			<div className="pl-sail pb-saib pr-sair pt-sait">
				<div className="items-center flex h-14 bg-red-50">
					<div className="text-2xl font-bold px-2">Fridgy</div>
				</div>
			</div>
		)
	}
})
