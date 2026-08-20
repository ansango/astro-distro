#!/usr/bin/env bun
/**
 * Reconcile src/config.json against src/projects-queue.json (source of truth).
 * - Projects whose URL is missing from the queue are removed from config.json.
 * - URLs in the queue that are not yet in config.json are fetched from GitHub and appended.
 * - Projects in config.json are reordered to match the order of the queue.
 * - The queue file is left untouched (it is the source of truth).
 * URLs that fail to validate/fetch are skipped; remove them from the queue to drop them.
 * Use:
 *   bun run scripts/reconcile-projects.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildProjectFromUrl,
	fetchRepo,
	parseRepoUrl,
	type Project,
} from "./lib/project.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONFIG_PATH = resolve(ROOT, "src/config.json");
const QUEUE_PATH = resolve(ROOT, "src/projects-queue.json");

interface Config {
	sections: {
		projects: {
			projects: Project[];
		};
	};
}

function readQueue(): string[] {
	try {
		const raw = readFileSync(QUEUE_PATH, "utf-8");
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			console.error("✗ projects-queue.json must be a JSON array of URLs");
			process.exit(1);
		}
		return parsed.filter((v): v is string => typeof v === "string");
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw err;
	}
}

function projectsEqualOrder(a: Project[], b: Project[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i].url !== b[i].url) return false;
	return true;
}

async function main() {
	const queue = readQueue();
	const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
	const projects = config.sections.projects.projects;
	const byUrl = new Map(projects.map((p) => [p.url, p] as const));

	const next: Project[] = [];
	let added = 0;
	let skipped = 0;

	for (const url of queue) {
		const existing = byUrl.get(url);
		if (existing) {
			next.push(existing);
			continue;
		}
		const parts = parseRepoUrl(url);
		if (!parts) {
			console.error(`✗ invalid URL, skipped: ${url}`);
			skipped++;
			continue;
		}
		const repo = await fetchRepo(parts.owner, parts.repo);
		if (!repo) {
			console.error(`✗ fetch failed, skipped: ${url}`);
			skipped++;
			continue;
		}
		next.push(buildProjectFromUrl(repo, url));
		added++;
		await new Promise((r) => setTimeout(r, 200));
	}

	const removed = projects.length - next.length;
	const reordered = !projectsEqualOrder(projects, next);

	if (added > 0 || removed > 0 || reordered) {
		config.sections.projects.projects = next;
		writeFileSync(CONFIG_PATH, JSON.stringify(config, null, "\t") + "\n");
	}

	console.log(
		`\n✓ ${added} added, ${removed} removed, ${skipped} skipped${reordered ? ", reordered" : ""}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
