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
	// Both sides render in the same browser on the same runner, and an unchanged page is
	// byte-identical between runs, so any pixel that differs is a real change. That rules out
	// both a colour threshold and pixelmatch's anti-aliasing detection, which skips differing
	// pixels on edges and would hide a recoloured 1px border or most of a text change.
	const diffPixels = pixelmatch(a, b, diff, canvas.width, canvas.height, {
		threshold: 0,
		includeAA: true
	});
	const changed = diffPixels > 0 || base.width !== pr.width || base.height !== pr.height;
	if (changed) {
		await sharp(diff, { raw: { width: canvas.width, height: canvas.height, channels: 4 } })
			.png()
			.toFile(diffFile);
	}
	return { changed, diffPixels, diffRatio: diffPixels / (canvas.width * canvas.height), base, pr };
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
			const { changed, ...result } = await compareImages(
				join(baseDir, name),
				join(prDir, name),
				join(diffDir, name)
			);
			results.push({ name, status: changed ? 'changed' : 'unchanged', ...result });
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
 * @param {object} [options]
 * @param {Record<string, ImageUrls>} [options.images] uploaded image URLs by screenshot name
 * @param {string} [options.baseRef]
 * @param {string} [options.runUrl]
 * @param {string} [options.headSha] the PR commit, so a comment left from an earlier push shows its age
 * @param {boolean} [options.baseCaptured] false when the base couldn't be built or screenshotted
 */
export function renderComment(
	results,
	{ images = {}, baseRef = 'main', runUrl, headSha, baseCaptured = true } = {}
) {
	const withStatus = (/** @type {Status} */ status) => results.filter((r) => r.status === status);
	const changed = withStatus('changed');
	const added = withStatus('added');
	const removed = withStatus('removed');
	const unchanged = withStatus('unchanged');
	const run = runUrl ? `[this run](${runUrl})` : 'this run';

	const title = headSha
		? `## 📸 Visual comparison of ${headSha.slice(0, 7)}`
		: '## 📸 Visual comparison';
	const lines = [COMMENT_MARKER, title, ''];
	if (results.length === 0) {
		lines.push('> ⚠️ No screenshots were captured.');
		return lines.join('\n') + '\n';
	}
	if (changed.length + added.length + removed.length === 0) {
		const all =
			results.length === 1 ? 'the 1 screenshot matches' : `all ${results.length} screenshots match`;
		lines.push(`✅ No visual changes: ${all} \`${baseRef}\` pixel for pixel.`);
	} else {
		lines.push(
			`**${changed.length} changed** · ${added.length} added · ${removed.length} removed · ` +
				`${unchanged.length} unchanged, compared with \`${baseRef}\`.`
		);
		if (!baseCaptured) {
			lines.push(
				'',
				`> ⚠️ \`${baseRef}\` couldn't be built or fully screenshotted, so screenshots missing ` +
					`from it are reported as added. See the job log of ${run}.`
			);
		}
		const embedded = Object.values(images).some((urls) => Object.values(urls).some(Boolean));
		if (!embedded) {
			lines.push(
				'',
				`> Images aren't embedded: this run has no ImgBB key, or uploading them failed (see the ` +
					`job log). Download the \`visual-comparison\` artifact from ${run} to see them.`
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
				`<b>${result.name}</b>: ${result.diffPixels.toLocaleString('en-US')} px differ ` +
					`(${percent(result.diffRatio)})${resized}`,
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
			body,
			signal: AbortSignal.timeout(30_000)
		});
		if (!response.ok) {
			console.warn(`ImgBB upload failed for ${name}: ${response.status} ${await response.text()}`);
			return null;
		}
		const json = await response.json();
		if (!json?.data?.url) console.warn(`ImgBB returned no URL for ${name}`);
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
			runUrl: process.env.RUN_URL,
			headSha: process.env.HEAD_SHA,
			baseCaptured: process.env.BASE_CAPTURED !== 'false'
		})
	);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
