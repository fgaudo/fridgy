import { expect } from 'chai'
import * as E from 'fp-ts/lib/Either'
import { throttleTime } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'

import { My_FoodData } from '@/domain/food'

import {
	My_FoodOverviewCmd,
	My_Sorting,
	foodOverview
} from '@/application/usecase/food-overview'

const testScheduler = new TestScheduler((actual, expected) => {
	// asserting the two objects are equal - required
	// for TestScheduler assertions to work via your test framework
	// e.g. using chai.
	expect(actual).deep.equal(expected)
})

// This test runs synchronously.
it('generates the stream correctly', () => {
	testScheduler.run(({ expectObservable, cold, hot }) => {
		const cmdsM = '  ---b-----a----b-----'
		const subM = '   ^------------------!'
		const expectM = 'l-al-b-lbl-a-l--b-l'
		const foodsM = ' --a-a----a--a-a---a'
		const nowM = '     -a|'

		const getFoods = () =>
			cold<readonly My_FoodData[]>(foodsM, {
				a: [
					{ name: '1', expDate: 3, id: '1', isBestBefore: true, type: 'dairy' }
				]
			})

		const cmds$ = hot<My_FoodOverviewCmd>(cmdsM, {
			b: { sort: 'date', page: 0 },
			a: { sort: 'name', page: 1 }
		})
		const now$ = cold<E.Either<string, number>>(nowM, { a: E.right(1) })

		const source$ = foodOverview({ onFoods: getFoods, onceNow: now$ })(cmds$)

		expectObservable(source$, subM).toBe(expectM, {
			a: {
				_tag: 'Ready',
				foods: [
					{
						expDate: 3,
						id: '1',
						name: '1',
						state: 'ok'
					}
				],
				now: 1,
				page: 1,
				total: 0,
				sort: 'name'
			},
			b: {
				_tag: 'Ready',
				foods: [
					{
						expDate: 3,
						id: '1',
						name: '1',
						state: 'ok'
					}
				],
				now: 1,
				page: 1,
				total: 0,
				sort: 'date'
			},
			l: {
				_tag: 'Loading'
			}
		})
	})
})
