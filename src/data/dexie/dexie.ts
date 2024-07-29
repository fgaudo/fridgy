import Dexie from 'dexie'
import { either as E } from 'fp-ts'

async function persistStorage() {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	return await navigator.storage?.persist?.()
}

export const createDB = async (): Promise<
	E.Either<string, Dexie>
> => {
	if (!(await persistStorage())) {
		return E.left(
			'This app needs persistent storage to work',
		)
	}

	const db = new Dexie('Fridgy')

	db.version(1).stores({
		products: '++id, name, expirationDate',
	})

	return E.right(db)
}
