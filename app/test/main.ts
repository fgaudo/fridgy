import { LogEntry } from '@/core/log'
import { Single } from '@/core/rxjs'
import { expect } from 'chai'
import * as E from 'fp-ts/lib/Either'
import { TestScheduler } from 'rxjs/testing'

import { FoodEntity } from '@/application/types/food'
import {
	FoodOverviewCmd,
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
		const expectM = '---------------------'
		const foodsM = ' --a---------a-a---a'

		const getFoods = () =>
			cold<readonly FoodEntity[]>(foodsM, {
				a: [
					{ name: '1', expDate: 3, id: '1', isBestBefore: true, type: 'dairy' }
				]
			})

		const cmds$ = hot<FoodOverviewCmd>(cmdsM, {
			b: { sort: 'date', page: 0 },
			a: { sort: 'name', page: 1 }
		})

		const now$ = cold<E.Either<string, number>>('-a|', {
			a: E.right(1)
		}) as unknown as Single<E.Either<string, number>>

		const flow$ = cold<string>('-a|', { a: '' }) as unknown as Single<string>

		const error$ = () =>
			cold<LogEntry>('-a|', {
				a: {
					_tag: 'CORE.Logging',
					message: 'messageResult',
					timestamp: '0',
					level: 'error'
				} as const
			}) as unknown as Single<LogEntry>

		const info$ = () =>
			cold<LogEntry>('-a|', {
				a: {
					_tag: 'CORE.Logging',
					message: 'messageResult',
					timestamp: '0',
					level: 'info'
				} as const
			}) as unknown as Single<LogEntry>

		const source$ = foodOverview({
			onFoods: getFoods,
			onceNow: now$,
			onceError: error$,
			onceFlow: flow$,
			onceInfo: info$
		})(cmds$)

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
