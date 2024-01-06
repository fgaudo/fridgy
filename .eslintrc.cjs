module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	settings: {
		react: {
			version: 'detect',
		},
		'import/parsers': {
			'@typescript-eslint/parser': [
				'.ts',
				'.tsx',
			],
		},
		'import/resolver': {
			typescript: {
				alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
			},
			node: true,
		},
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/strict-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',
		'plugin:import/recommended',
		'plugin:import/typescript',
		'prettier',
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		project: [
			'./tsconfig.json',
			'./tsconfig.node.json',
		],
		tsconfigRootDir: __dirname,
	},
	ignorePatterns: ['dist', '.eslintrc.cjs'],
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
		'react-refresh',
		'react',
		'import',
	],
	rules: {
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['../*'],
						message:
							'Usage of relative parent imports is not allowed.',
					},
				],
			},
		],
		'import/no-restricted-paths': [
			'error',
			{
				zones: [
					{
						target: [
							'./src/app',
							'./src/core',
							'./src/data',
							'./src/domain',
							'./src/ui',
						],
						from: ['./src/*.ts', './src/*.tsx'],
					},
					{
						target: [
							'./src/app',
							'./src/core',
							'./src/data',
							'./src/domain',
						],
						from: ['./src/ui'],
					},
					{
						target: [
							'./src/app',
							'./src/core',
							'./src/domain',
						],
						from: ['./src/data'],
					},
					{
						target: [
							'./src/core',
							'./src/domain',
						],
						from: ['./src/app'],
					},
					{
						target: ['./src/core'],
						from: ['./src/domain'],
					},
				],
			},
		],
		'import/no-self-import': 'error',
		'import/no-useless-path-segments': 'error',
		'import/no-unused-modules': [
			1,
			{
				unusedExports: true,
				missingExports: true,
			},
		],
		'import/no-unresolved': 'error',
		'import/no-cycle': 'error',
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true },
		],
		'react/jsx-filename-extension': [
			1,
			{ extensions: ['.tsx'] },
		],
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-empty-interface': [
			'off',
		],
	},
}
