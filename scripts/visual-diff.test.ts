import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { COMMENT_MARKER, compareScreenshots, renderComment } from './visual-diff.mjs';

type Rgb = [number, number, number];

let root: string;
let baseDir: string;
let prDir: string;

/** Writes a PNG with the colour colorAt gives each pixel. */
async function draw(
	file: string,
	width: number,
	height: number,
	colorAt: (x: number, y: number) => Rgb
) {
	const data = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) data.set([...colorAt(x, y), 255], (y * width + x) * 4);
	}
	await sharp(data, { raw: { width, height, channels: 4 } })
		.png()
		.toFile(file);
}

/** Writes a flat-coloured PNG, optionally with one pixel in another colour. */
function png(
	file: string,
	width: number,
	height: number,
	fill: Rgb = [245, 245, 245],
	pixel?: { x: number; y: number; color: Rgb }
) {
	return draw(file, width, height, (x, y) =>
		pixel && x === pixel.x && y === pixel.y ? pixel.color : fill
	);
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'visual-diff-'));
	baseDir = join(root, 'base');
	prDir = join(root, 'pr');
	mkdirSync(baseDir);
	mkdirSync(prDir);
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('compareScreenshots', () => {
	it('reports identical screenshots as unchanged and writes no diff', async () => {
		await png(join(baseDir, 'page.png'), 20, 10);
		await png(join(prDir, 'page.png'), 20, 10);

		const [result] = await compareScreenshots(baseDir, prDir, root);

		expect(result).toMatchObject({ name: 'page.png', status: 'unchanged', diffPixels: 0 });
		expect(existsSync(join(root, 'diff', 'page.png'))).toBe(false);
	});

	it('catches a one-step colour change in a single pixel', async () => {
		await png(join(baseDir, 'page.png'), 20, 10);
		await png(join(prDir, 'page.png'), 20, 10, [245, 245, 245], {
			x: 5,
			y: 5,
			color: [244, 245, 245]
		});

		const [result] = await compareScreenshots(baseDir, prDir, root);

		expect(result).toMatchObject({ status: 'changed', diffPixels: 1, diffRatio: 1 / 200 });
		expect(existsSync(join(root, 'diff', 'page.png'))).toBe(true);
	});

	it('counts edge pixels too, so a recoloured 1px line is caught', async () => {
		// Black | 1px grey divider | white. pixelmatch's anti-aliasing detection would skip the
		// divider's pixels and call this unchanged.
		const divider =
			(grey: number) =>
			(x: number): Rgb =>
				x < 4 ? [0, 0, 0] : x === 4 ? [grey, grey, grey] : [255, 255, 255];
		await draw(join(baseDir, 'page.png'), 9, 9, divider(128));
		await draw(join(prDir, 'page.png'), 9, 9, divider(131));

		const [result] = await compareScreenshots(baseDir, prDir, root);

		expect(result).toMatchObject({ status: 'changed', diffPixels: 9 });
	});

	it('counts the rows a page grew by as changed', async () => {
		await png(join(baseDir, 'page.png'), 20, 10);
		await png(join(prDir, 'page.png'), 20, 12);

		const [result] = await compareScreenshots(baseDir, prDir, root);

		expect(result).toMatchObject({
			status: 'changed',
			diffPixels: 40,
			base: { width: 20, height: 10 },
			pr: { width: 20, height: 12 }
		});
		const diff = await sharp(join(root, 'diff', 'page.png')).metadata();
		expect([diff.width, diff.height]).toEqual([20, 12]);
	});

	it('reports a size change even when no pixel differs', async () => {
		// The shorter screenshot is padded with magenta, so a new magenta row diffs as 0 pixels
		await png(join(baseDir, 'page.png'), 4, 4, [255, 0, 255]);
		await png(join(prDir, 'page.png'), 4, 5, [255, 0, 255]);

		const [result] = await compareScreenshots(baseDir, prDir, root);

		expect(result).toMatchObject({ status: 'changed', diffPixels: 0 });
		expect(existsSync(join(root, 'diff', 'page.png'))).toBe(true);
	});

	it('reports screenshots that exist on only one side as added or removed', async () => {
		await png(join(baseDir, 'old.png'), 4, 4);
		await png(join(prDir, 'new.png'), 4, 4);

		const results = await compareScreenshots(baseDir, prDir, root);

		expect(results.map((r) => [r.name, r.status])).toEqual([
			['new.png', 'added'],
			['old.png', 'removed']
		]);
	});

	it('treats a missing base directory as every screenshot being new', async () => {
		await png(join(prDir, 'page.png'), 4, 4);

		const results = await compareScreenshots(join(root, 'missing'), prDir, root);

		expect(results.map((r) => r.status)).toEqual(['added']);
	});
});

describe('renderComment', () => {
	const size = { width: 1280, height: 2400 };
	const unchanged = (name: string) => ({
		name,
		status: 'unchanged' as const,
		diffPixels: 0,
		diffRatio: 0,
		base: size,
		pr: size
	});

	it('says so when nothing changed', () => {
		const comment = renderComment([unchanged('a.png'), unchanged('b.png')]);

		expect(comment.startsWith(COMMENT_MARKER)).toBe(true);
		expect(comment).toContain('No visual changes: all 2 screenshots match `main`');
		expect(comment).not.toContain('<img');
	});

	it('uses the singular for a single screenshot', () => {
		expect(renderComment([unchanged('a.png')])).toContain('the 1 screenshot matches `main`');
	});

	it('shows base, PR and diff images for a changed screenshot', () => {
		const changed = {
			name: 'dough-page.png',
			status: 'changed' as const,
			diffPixels: 3072,
			diffRatio: 0.001,
			base: size,
			pr: { width: 1280, height: 2550 }
		};
		const comment = renderComment([changed, unchanged('tools-page.png')], {
			images: {
				'dough-page.png': {
					base: 'https://i/base.png',
					pr: 'https://i/pr.png',
					diff: 'https://i/diff.png'
				}
			},
			runUrl: 'https://github.com/o/r/actions/runs/1'
		});

		expect(comment).toContain('**1 changed** · 0 added · 0 removed · 1 unchanged');
		expect(comment).toContain(
			'<b>dough-page.png</b>: 3,072 px differ (0.10 %), 1280×2400 → 1280×2550'
		);
		expect(comment).toContain('<img src="https://i/diff.png"');
		expect(comment).toContain('<summary>1 unchanged</summary>');
		expect(comment).toContain('[this run](https://github.com/o/r/actions/runs/1)');
	});

	const added = {
		name: 'new.png',
		status: 'added' as const,
		diffPixels: 0,
		diffRatio: 0,
		base: null,
		pr: size
	};

	it('points to the artifact when there are no images', () => {
		const comment = renderComment([added]);

		expect(comment).toContain('### Added');
		expect(comment).toContain('- <b>new.png</b>: new screenshot');
		expect(comment).not.toContain('<table');
		expect(comment).toContain("Images aren't embedded: this run has no ImgBB key");
	});

	it('points to the artifact when every upload failed', () => {
		const comment = renderComment([added], { images: { 'new.png': { pr: null } } });

		expect(comment).toContain("Images aren't embedded");
		expect(comment).not.toContain('<table');
	});

	it('warns when the base could not be captured', () => {
		const comment = renderComment([added], { baseCaptured: false });

		expect(comment).toContain("`main` couldn't be built or fully screenshotted");
	});

	it('names the commit it compared', () => {
		const comment = renderComment([unchanged('a.png')], { headSha: '5a5e0b31c5f77f37e38bd7f' });

		expect(comment).toContain('## 📸 Visual comparison of 5a5e0b3\n');
	});

	it('warns when no screenshots were captured', () => {
		expect(renderComment([])).toContain('No screenshots were captured');
	});
});
