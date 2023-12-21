import * as Rx from 'rxjs'

import { OnFoods } from '@/application/interfaces/streams/foods'

export const nativeOnFoods: OnFoods = () =>
	Rx.of([
		{
			name: '',
			expDate: 0,
			id: '',
			isBestBefore: true,
			type: 'dairy'
		} as const
	])
