import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		},
		alias: {
			'content-collections': './.content-collections/generated'
		}
	}
};

export default config;
