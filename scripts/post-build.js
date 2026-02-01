import { copyFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy index.html to 404.html for GitHub Pages SPA support
const buildDir = join(__dirname, '../build');
const indexPath = join(buildDir, 'index.html');
const notFoundPath = join(buildDir, '404.html');

try {
	copyFileSync(indexPath, notFoundPath);
	console.log('✓ Created 404.html for GitHub Pages SPA support');
} catch (error) {
	console.error('Failed to create 404.html:', error.message);
	process.exit(1);
}
