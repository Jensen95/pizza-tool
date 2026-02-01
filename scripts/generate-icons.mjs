import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';

async function generateIcons() {
	const svgPath = 'static/icons/icon.svg';
	const svgBuffer = readFileSync(svgPath);

	// Ensure icons directory exists
	mkdirSync('static/icons', { recursive: true });

	// Generate different sizes
	const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

	console.log('Generating PNG icons from SVG...');

	for (const size of sizes) {
		const outputPath = `static/icons/icon-${size}.png`;
		await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
		console.log(`✓ Generated icon-${size}.png`);
	}

	console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
