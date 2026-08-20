#!/usr/bin/env node
import { mkdirSync } from "node:fs";
/**
 * One-off screenshot capture for the astro-distro template.
 *
 * Usage:
 *   bun run build
 *   bun run preview &              # serves dist/ at http://127.0.0.1:4321
 *   node scripts/screenshot.mjs    # captures and writes PNGs
 *
 * Requires playwright available via NODE_PATH or installed globally.
 * This file is intentionally NOT wired to package.json so it doesn't
 * add playwright as a project dep.
 */
import { chromium } from "playwright";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:4321";
const THEMES = ["debian", "arch", "ubuntu", "kali"];
const SECTIONS = [
	{ id: "about", file: "lazygit" },
	{ id: "projects", file: "ranger" },
	{ id: "uses", file: "btop" },
	{ id: "contact", file: "mutt" },
];

const OUT = "docs/screenshots";
mkdirSync(`${OUT}/themes`, { recursive: true });
mkdirSync(`${OUT}/components`, { recursive: true });

const browser = await chromium.launch();

// ── Theme screenshots (1280×800 viewport) ────────────────────────────
const themeCtx = await browser.newContext({
	viewport: { width: 1280, height: 800 },
});
for (const theme of THEMES) {
	await themeCtx.addInitScript((t) => {
		localStorage.setItem("theme", t);
	}, theme);
	const page = await themeCtx.newPage();
	await page.goto(BASE, { waitUntil: "networkidle" });
	await page.waitForTimeout(400);
	const path = `${OUT}/themes/theme-${theme}.png`;
	await page.screenshot({ path });
	await page.close();
	console.log(`✓ ${path}`);
}
await themeCtx.close();

// ── Component screenshots (default theme: debian) ───────────────────
const compCtx = await browser.newContext({
	viewport: { width: 1280, height: 800 },
});
await compCtx.addInitScript(() => {
	localStorage.setItem("theme", "debian");
});
const compPage = await compCtx.newPage();
await compPage.goto(BASE, { waitUntil: "networkidle" });
await compPage.waitForTimeout(400);

for (const { id, file } of SECTIONS) {
	const section = compPage.locator(`#${id}`);
	const path = `${OUT}/components/component-${file}.png`;
	await section.screenshot({ path });
	console.log(`✓ ${path}`);
}
await compCtx.close();

// ── Featured (1200×630, debian theme, top of page) ──────────────────
const featCtx = await browser.newContext({
	viewport: { width: 1200, height: 630 },
});
await featCtx.addInitScript(() => {
	localStorage.setItem("theme", "debian");
});
const featPage = await featCtx.newPage();
await featPage.goto(BASE, { waitUntil: "networkidle" });
await featPage.waitForTimeout(400);
const featured = `${OUT}/featured.png`;
await featPage.screenshot({ path: featured });
console.log(`✓ ${featured}`);
await featCtx.close();

await browser.close();
