import { ObservableEither } from 'fp-ts-rxjs/lib/ObservableEither'

export type Now$ = ObservableEither<string, number>
