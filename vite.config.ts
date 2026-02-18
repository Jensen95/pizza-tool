import { sveltekit } from '@sveltejs/kit/vite';
import contentCollections from '@content-collections/vite';
import { defineConfig } from 'vitest/config';

const isTest = process.env.VITEST === 'true';

export default defineConfig({
	plugins: [!isTest && contentCollections(), sveltekit()].filter(Boolean),
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/tests/setup.ts'],
		// Only include unit tests, not e2e tests
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/e2e/**',
			'**/.{idea,git,cache,output,temp}/**'
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'src/tests/e2e/', 'src/tests/setup.ts']
		},
		alias: {
			$lib: '/src/lib'
		}
	},
	resolve: {
		conditions: ['browser']
	}
});
