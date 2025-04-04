import {
	CapacitorService,
	dependenciesLive,
} from '$lib/business/data/capacitor';
import type { FridgySqlitePlugin } from '$lib/business/data/capacitor/fridgy-sqlite-plugin';
import { render } from '$lib/ui/index.tsx';
import { registerPlugin } from '@capacitor/core';

import { L } from '$lib/core/imports.ts';

const root = document.getElementById('root')!;

const db = registerPlugin<FridgySqlitePlugin>(
	'FridgySqlitePlugin',
);

void render(
	L.provide(
		dependenciesLive,
		L.succeed(CapacitorService, { db }),
	),
	root,
);
