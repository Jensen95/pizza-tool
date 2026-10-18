/**
 * Pixel-diffs the base branch's screenshots against a PR's and writes the PR comment.
 * Used by .github/workflows/visual-comparison.yml.
 *
 *   node scripts/visual-diff.mjs <baseDir> <prDir> <outDir>
 *
 * Writes <outDir>/diff/<name>.png for every screenshot that changed, plus <outDir>/report.json
 * and <outDir>/comment.md. With IMGBB_API_KEY set, the images of every changed, added or removed
 * screenshot are uploaded to ImgBB and embedded in the comment; unchanged ones never are.
 */
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const COMMENT_MARKER = '<!-- visual-comparison -->';

// Fills the shorter screenshot when page sizes differ, so growth and shrinkage show up as diff
const PADDING = { r: 255, g: 0, b: 255, alpha: 1 };

/**
 * @typedef {{ width: number, height: number }} Size
 * @typedef {'changed' | 'added' | 'removed' | 'unchanged'} Status
 * @typedef {{ name: string, status: Status, diffPixels: number, diffRatio: number, base: Size | null, pr: Size | null }} Result
 * @typedef {{ base?: string | null, pr?: string | null, diff?: string | null }} ImageUrls
 */

/** @param {string} file @returns {Promise<Size>} */
async function sizeOf(file) {
	const { width, height } = await sharp(file).metadata();
	return { width, height };
}

/** @param {string} file @param {Size} own @param {Size} canvas */
function rgba(file, own, canvas) {
	return sharp(file)
		.ensureAlpha()
		.extend({
			right: canvas.width - own.width,
			bottom: canvas.height - own.height,
			background: PADDING
		})
		.raw()
		.toBuffer();
}

/**
 * Compares two screenshots. Writes a diff image (changed pixels in red over a faded copy of the
 * base) to diffFile only when they differ.
 *
 * @param {string} baseFile
 * @param {string} prFile
 * @param {string} diffFile
 */
export async function compareImages(baseFile, prFile, diffFile) {
	const [base, pr] = await Promise.all([sizeOf(baseFile), sizeOf(prFile)]);
	const canvas = {
		width: Math.max(base.width, pr.width),
		height: Math.max(base.height, pr.height)
	};
	const [a, b] = await Promise.all([rgba(baseFile, base, canvas), rgba(prFile, pr, canvas)]);
	const diff = Buffer.alloc(canvas.width * canvas.height * 4);
	// Threshold 0: both sides render in the same browser on the same runner, so a pixel that
	// differs at all is a real change. Anti-aliasing detection stays on to ignore edge noise.
	const diffPixels = pixelmatch(a, b, diff, canvas.width, canvas.height, { threshold: 0 });
	if (diffPixels > 0) {
		await sharp(diff, { raw: { width: canvas.width, height: canvas.height, channels: 4 } })
			.png()
			.toFile(diffFile);
	}
	return { diffPixels, diffRatio: diffPixels / (canvas.width * canvas.height), base, pr };
}

/** @param {string} dir */
function pngsIn(dir) {
	return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.png')) : [];
}

/**
 * Compares every screenshot in baseDir with the one of the same name in prDir.
 *
 * @param {string} baseDir
 * @param {string} prDir
 * @param {string} outDir diff images go in outDir/diff
 * @returns {Promise<Result[]>}
 */
export async function compareScreenshots(baseDir, prDir, outDir) {
	const baseNames = new Set(pngsIn(baseDir));
	const prNames = new Set(pngsIn(prDir));
	const diffDir = join(outDir, 'diff');
	mkdirSync(diffDir, { recursive: true });

	/** @type {Result[]} */
	const results = [];
	for (const name of [...new Set([...baseNames, ...prNames])].sort()) {
		if (!baseNames.has(name)) {
			const pr = await sizeOf(join(prDir, name));
			results.push({ name, status: 'added', diffPixels: 0, diffRatio: 0, base: null, pr });
		} else if (!prNames.has(name)) {
			const base = await sizeOf(join(baseDir, name));
			results.push({ name, status: 'removed', diffPixels: 0, diffRatio: 0, base, pr: null });
		} else {
			const result = await compareImages(
				join(baseDir, name),
				join(prDir, name),
				join(diffDir, name)
			);
			results.push({ name, status: result.diffPixels > 0 ? 'changed' : 'unchanged', ...result });
		}
	}
	return results;
}

/** @param {number} ratio */
function percent(ratio) {
	return ratio < 0.0001 ? '< 0.01 %' : `${(ratio * 100).toFixed(2)} %`;
}

/** @param {Size | null} size */
function dimensions(size) {
	return size ? `${size.width}×${size.height}` : '';
}

/**
 * One screenshot: a collapsible block with its images side by side, or a plain list item when
 * none were uploaded.
 *
 * @param {string} summary
 * @param {boolean} open
 * @param {string[]} headers
 * @param {Array<string | null | undefined>} urls one per header
 */
function entry(summary, open, headers, urls) {
	if (!urls.some(Boolean)) return ['', `- ${summary}`];
	const head = headers.map((header) => `<th>${header}</th>`).join('');
	const cells = urls
		.map((url, i) =>
			url ? `<td><img src="${url}" alt="${headers[i]}" width="260" /></td>` : '<td>–</td>'
		)
		.join('');
	return [
		'',
		open ? '<details open>' : '<details>',
		`<summary>${summary}</summary>`,
		'',
		`<table><tr>${head}</tr><tr>${cells}</tr></table>`,
		'',
		'</details>'
	];
}

/**
 * Renders the PR comment. Starts with COMMENT_MARKER so the workflow can update its own comment
 * instead of adding a new one on every push.
 *
 * @param {Result[]} results
 * @param {{ images?: Record<string, ImageUrls>, baseRef?: string, runUrl?: string }} [options]
 */
export function renderComment(results, { images = {}, baseRef = 'main', runUrl } = {}) {
	const withStatus = (/** @type {Status} */ status) => results.filter((r) => r.status === status);
	const changed = withStatus('changed');
	const added = withStatus('added');
	const removed = withStatus('removed');
	const unchanged = withStatus('unchanged');
	const run = runUrl ? `[this run](${runUrl})` : 'this run';

	const lines = [COMMENT_MARKER, '## 📸 Visual comparison', ''];
	if (results.length === 0) {
		lines.push('> ⚠️ No screenshots were captured.');
		return lines.join('\n') + '\n';
	}
	if (changed.length + added.length + removed.length === 0) {
		lines.push(
			`✅ No visual changes: all ${results.length} screenshots match \`${baseRef}\` pixel for pixel.`
		);
	} else {
		lines.push(
			`**${changed.length} changed** · ${added.length} added · ${removed.length} removed · ` +
				`${unchanged.length} unchanged, compared with \`${baseRef}\`.`
		);
		if (Object.keys(images).length === 0) {
			lines.push(
				'',
				`> Images aren't embedded because this run has no ImgBB key. ` +
					`Download the \`visual-comparison\` artifact from ${run} to see them.`
			);
		}
	}

	if (changed.length > 0) lines.push('', '### Changed');
	for (const result of changed) {
		const urls = images[result.name] ?? {};
		const resized =
			dimensions(result.base) === dimensions(result.pr)
				? ''
				: `, ${dimensions(result.base)} → ${dimensions(result.pr)}`;
		lines.push(
			...entry(
				`<b>${result.name}</b>: ${percent(result.diffRatio)} of pixels differ${resized}`,
				true,
				[`Base (${baseRef})`, 'This PR', 'Diff'],
				[urls.base, urls.pr, urls.diff]
			)
		);
	}

	if (added.length > 0) lines.push('', '### Added');
	for (const result of added) {
		lines.push(
			...entry(
				`<b>${result.name}</b>: new screenshot`,
				true,
				['This PR'],
				[images[result.name]?.pr]
			)
		);
	}

	if (removed.length > 0) lines.push('', '### Removed');
	for (const result of removed) {
		lines.push(
			...entry(
				`<b>${result.name}</b>: no longer captured`,
				false,
				[`Base (${baseRef})`],
				[images[result.name]?.base]
			)
		);
	}

	if (unchanged.length > 0 && unchanged.length < results.length) {
		lines.push(
			'',
			`<details><summary>${unchanged.length} unchanged</summary>`,
			'',
			unchanged.map((result) => `\`${result.name}\``).join(', '),
			'',
			'</details>'
		);
	}

	lines.push(
		'',
		`<sub>Both sides are captured with this PR's screenshot specs (fixed clock, time zone and ` +
			`locale), so only app changes show up. Full-size screenshots and diffs are in the ` +
			`\`visual-comparison\` artifact of ${run}.</sub>`
	);
	return lines.join('\n') + '\n';
}

/** @param {string} file @param {string} name @param {string} apiKey */
async function uploadToImgBB(file, name, apiKey) {
	try {
		const body = new URLSearchParams({ image: readFileSync(file).toString('base64'), name });
		const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
			method: 'POST',
			body
		});
		if (!response.ok) {
			console.warn(`ImgBB upload failed for ${name}: ${response.status}`);
			return null;
		}
		const json = await response.json();
		return json?.data?.url ?? null;
	} catch (error) {
		console.warn(`ImgBB upload failed for ${name}:`, error);
		return null;
	}
}

async function main() {
	const [baseDir, prDir, outDir] = process.argv.slice(2);
	if (!outDir) {
		console.error('Usage: node scripts/visual-diff.mjs <baseDir> <prDir> <outDir>');
		process.exit(2);
	}

	const results = await compareScreenshots(baseDir, prDir, outDir);
	for (const result of results) {
		const detail = result.status === 'changed' ? ` (${percent(result.diffRatio)})` : '';
		console.log(`${result.status.padEnd(9)} ${result.name}${detail}`);
	}

	/** @type {Record<string, ImageUrls>} */
	const images = {};
	const apiKey = process.env.IMGBB_API_KEY;
	if (apiKey) {
		for (const result of results.filter((r) => r.status !== 'unchanged')) {
			const { name } = result;
			images[name] = {
				base: result.base && (await uploadToImgBB(join(baseDir, name), `base-${name}`, apiKey)),
				pr: result.pr && (await uploadToImgBB(join(prDir, name), `pr-${name}`, apiKey)),
				diff:
					result.status === 'changed'
						? await uploadToImgBB(join(outDir, 'diff', name), `diff-${name}`, apiKey)
						: null
			};
		}
	}

	writeFileSync(join(outDir, 'report.json'), JSON.stringify(results, null, '\t') + '\n');
	writeFileSync(
		join(outDir, 'comment.md'),
		renderComment(results, {
			images,
			baseRef: process.env.BASE_REF || 'main',
			runUrl: process.env.RUN_URL
		})
	);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
