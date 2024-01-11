import { readerIO as RIO } from 'fp-ts'
import { v4 } from 'uuid'

import { R_GenerateUUID } from '@/app/queries/generate-uuid'

interface Deps {}

export const generateUUID: R_GenerateUUID<Deps> =
	RIO.fromIO(() => v4())
