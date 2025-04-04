import { registerPlugin } from '@capacitor/core';

export interface FridgySqlitePlugin {
	getAllProductsWithTotal(): Promise<unknown>;

	addProduct(data: {
		product: {
			name: string;
			creationDate: number;
			expirationDate: number | undefined;
		};
	}): Promise<unknown>;

	deleteProductsByIds(data: {
		ids: readonly number[];
	}): Promise<unknown>;
}

export const registerSqlitePlugin = () =>
	registerPlugin<FridgySqlitePlugin>(
		'FridgySqlitePlugin',
	);
