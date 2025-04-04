import { render } from '$lib/ui/index.tsx';

import { dependencies } from '$lib/data/internal/mock';

const root = document.getElementById('root')!;

void render(dependencies, root);
