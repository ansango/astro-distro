#!/usr/bin/env bun
/**
 * Read repo URLs from src/projects-queue.json, fetch their metadata from GitHub,
 * append them to src/config.json (sections.projects.projects), and empty the queue.
 * URLs that fail (invalid or fetch error) remain in the queue for retry.
 * Use:
 *   bun run scripts/add-projects.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildProjectFromUrl,
	fetchRepo,
	type Project,
	parseRepoUrl,
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

async function main() {
	const queue = readQueue();

	if (queue.length === 0) {
		console.log("Queue is empty, nothing to add");
		return;
	}

	const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
	const projects = config.sections.projects.projects;
	const existing = new Set(projects.map((p) => p.url));

	let added = 0;
	let skipped = 0;
	const remaining: string[] = [];

	for (const url of queue) {
		console.log(`→ ${url}`);
		if (existing.has(url)) {
			console.log("  ↷ already in config, skipping");
			skipped++;
			continue;
		}
		const parts = parseRepoUrl(url);
		if (!parts) {
			console.error("  ✗ invalid GitHub URL, kept in queue");
			remaining.push(url);
			continue;
		}
		const repo = await fetchRepo(parts.owner, parts.repo);
		if (!repo) {
			console.error("  ✗ fetch failed, kept in queue");
			remaining.push(url);
			continue;
		}
		projects.push(buildProjectFromUrl(repo, url));
		existing.add(url);
		added++;
		await new Promise((r) => setTimeout(r, 200));
	}

	if (added > 0) {
		writeFileSync(CONFIG_PATH, JSON.stringify(config, null, "\t") + "\n");
	}
	writeFileSync(QUEUE_PATH, JSON.stringify(remaining, null, "\t") + "\n");
	console.log(
		`\n✓ ${added} added, ${skipped} skipped, ${remaining.length} kept in queue`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
