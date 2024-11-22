import { appMock } from '@/data/mock/index.ts'

import { render } from '@/ui/index.tsx'

const root = document.getElementById('root')!

void render(appMock, root)
