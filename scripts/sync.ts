#!/usr/bin/env bun
/**
 * Reconcile src/config.json against src/queue.yml.
 * - Projects: every URL in queue.yml is fetched from GitHub. Existing entries are
 *   refreshed in place; missing ones are appended; entries no longer in the queue are dropped.
 * - `current`: rewritten from YAML (slug + host fields + booted_at).
 * - `sections.about.status`: rewritten from YAML verbatim.
 * - queue.yml is left untouched (it is the source of truth).
 * Use:
 *   bun run scripts/sync.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
const QUEUE_PATH = resolve(ROOT, "src/queue.yml");

interface Queue {
	current: string;
	booted_at: string;
	host: {
		name: string;
		cpu: string;
		gpu: string;
		memory: string;
		resolution: string;
	};
	about: {
		status: {
			branch: string;
			since: number | string;
			ahead: number;
			behind: number;
			modified: number;
			untracked: number;
		};
	};
	projects: string[];
}

interface Config {
	current: Record<string, unknown>;
	sections: {
		about: {
			command: string;
			status: Record<string, unknown>;
			bio: unknown[];
			paths: unknown[];
		};
		projects: {
			command: string;
			root: string;
			projects: Project[];
		};
	};
}

function readQueue(): Queue {
	const raw = readFileSync(QUEUE_PATH, "utf-8");
	const parsed = Bun.YAML.parse(raw) as Queue;
	if (!parsed.projects || !Array.isArray(parsed.projects)) {
		console.error("✗ queue.yml must have a `projects` array");
		process.exit(1);
	}
	return parsed;
}

async function main() {
	const queue = readQueue();
	const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
	const projects = config.sections.projects.projects;
	const byUrl = new Map(projects.map((p) => [p.url, p] as const));

	const next: Project[] = [];
	let added = 0;
	let refreshed = 0;
	let skipped = 0;

	for (const url of queue.projects) {
		const existing = byUrl.get(url);
		const parts = parseRepoUrl(url);
		if (!parts) {
			console.error(`✗ invalid URL, skipped: ${url}`);
			skipped++;
			if (existing) next.push(existing);
			continue;
		}
		const repo = await fetchRepo(parts.owner, parts.repo);
		if (!repo) {
			console.error(`✗ fetch failed, skipped: ${url}`);
			skipped++;
			if (existing) next.push(existing);
			continue;
		}
		const fresh = buildProjectFromUrl(repo, url);
		if (existing) {
			Object.assign(existing, fresh);
			next.push(existing);
			refreshed++;
		} else {
			next.push(fresh);
			added++;
		}
		await new Promise((r) => setTimeout(r, 200));
	}

	const removed = projects.length - next.length;

	config.current = {
		slug: queue.current,
		booted_at: queue.booted_at,
		host: queue.host.name,
		cpu: queue.host.cpu,
		gpu: queue.host.gpu,
		memory: queue.host.memory,
		resolution: queue.host.resolution,
	};
	config.sections.about.status = { ...queue.about.status };
	config.sections.projects.projects = next;

	writeFileSync(CONFIG_PATH, JSON.stringify(config, null, "\t") + "\n");

	console.log(
		`\n✓ ${added} added, ${refreshed} refreshed, ${removed} removed, ${skipped} skipped`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
